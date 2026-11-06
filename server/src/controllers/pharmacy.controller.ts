import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  Consultation,
  ConsultationStatus,
  Inventory,
  Invoice,
  InvoicePaymentMethod,
  InvoiceStatus,
  PharmacySale,
} from "../models/index.js";
import { getIO } from "../socket.js";

const bad = (res: Response, status: number, message: string) =>
  res.status(status).json({ success: false, message });

async function expireUnpaidPharmacyBills() {
  const expiry = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const staleSales = await PharmacySale.find({
    status: "AWAITING_PAYMENT",
    createdAt: { $lt: expiry },
  });
  for (const sale of staleSales) {
    const invoice = await Invoice.findById(sale.invoice);
    if (
      !invoice ||
      invoice.status === InvoiceStatus.PAID ||
      (invoice.paidAmount || 0) > 0
    )
      continue;
    for (const item of sale.items) {
      await Inventory.updateOne(
        { _id: item.inventoryItem, reservedStock: { $gte: item.quantity } },
        { $inc: { reservedStock: -item.quantity } },
      );
    }
    invoice.status = InvoiceStatus.CANCELLED;
    invoice.pharmacySale = undefined;
    await invoice.save();
    await PharmacySale.deleteOne({ _id: sale._id, status: "AWAITING_PAYMENT" });
    getIO()?.emit("invoice_updated", { invoiceId: invoice._id });
    getIO()?.emit("admin:data_changed", {
      types: ["invoices", "billing", "inventory"],
    });
  }
}

export const getPharmacyCatalog = async (_req: Request, res: Response) => {
  try {
    await expireUnpaidPharmacyBills();
    const items = await Inventory.find({
      unitPrice: { $gt: 0 },
      $expr: {
        $gt: [
          { $subtract: ["$currentStock", { $ifNull: ["$reservedStock", 0] }] },
          0,
        ],
      },
    })
      .select("itemName itemCode category currentStock unit unitPrice")
      .sort({ itemName: 1 })
      .lean();
    res.json({
      success: true,
      items: items.map((item) => ({
        ...item,
        availableStock: Math.max(
          0,
          item.currentStock - (item.reservedStock || 0),
        ),
      })),
    });
  } catch (error) {
    console.error("getPharmacyCatalog failed", error);
    bad(res, 500, "Unable to load pharmacy stock");
  }
};

export const getPendingPrescriptions = async (_req: Request, res: Response) => {
  try {
    await expireUnpaidPharmacyBills();
    const prescriptions = await Consultation.find({
      status: ConsultationStatus.COMPLETED,
      medicines: { $exists: true, $not: { $size: 0 } },
      "medicines.isDispensed": { $ne: true },
    })
      .populate("patient", "name phone")
      .populate("doctor", "name")
      .sort({ createdAt: -1 })
      .lean();
    const sales = await PharmacySale.find({
      consultation: { $in: prescriptions.map((p) => p._id) },
      status: { $in: ["AWAITING_PAYMENT", "DISPENSING"] },
    })
      .populate("invoice", "status totalAmount paidAmount paymentMethod")
      .sort({ createdAt: -1 })
      .lean();
    const salesByConsultation = new Map(
      sales.map((sale) => [sale.consultation.toString(), sale]),
    );
    res.json({
      success: true,
      prescriptions: prescriptions.map((p) => ({
        ...p,
        sale: salesByConsultation.get(p._id.toString()),
      })),
    });
  } catch (error) {
    console.error("getPendingPrescriptions failed", error);
    bad(res, 500, "Unable to load pending prescriptions");
  }
};

export const getPrescriptionHistory = async (_req: Request, res: Response) => {
  try {
    const sales = await PharmacySale.find({ status: "DISPENSED" })
      .populate("patient", "name phone")
      .populate("pharmacist", "name")
      .populate("dispensedBy", "name")
      .populate(
        "invoice",
        "status totalAmount paidAmount paymentMethod paymentHistory createdAt",
      )
      .populate("consultation", "doctor createdAt")
      .sort({ dispensedAt: -1 })
      .lean();
    res.json({ success: true, sales });
  } catch (error) {
    console.error("getPrescriptionHistory failed", error);
    bad(res, 500, "Unable to load pharmacy history");
  }
};

export const createPharmacyBill = async (req: Request, res: Response) => {
  const reserved: { id: mongoose.Types.ObjectId; quantity: number }[] = [];
  let billCommitted = false;
  try {
    await expireUnpaidPharmacyBills();
    const { consultationId } = req.params;
    const { items } = req.body as {
      items?: {
        medicineId?: string;
        inventoryItemId: string;
        quantity: number;
      }[];
    };
    if (
      !mongoose.isValidObjectId(consultationId) ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return bad(
        res,
        400,
        "Select at least one prescription item from available pharmacy stock",
      );
    }
    const consultation = await Consultation.findById(consultationId);
    if (!consultation) return bad(res, 404, "Consultation not found");
    if (consultation.status !== ConsultationStatus.COMPLETED)
      return bad(res, 409, "Only completed prescriptions can be billed");
    const existingSale = await PharmacySale.findOne({
      consultation: consultation._id,
    }).populate("invoice", "status totalAmount paidAmount");
    if (existingSale)
      return res
        .status(409)
        .json({
          success: false,
          message: "This prescription already has a pharmacy sale",
          sale: existingSale,
        });

    const requested = new Set<string>();
    const normalized: {
      medicineId?: mongoose.Types.ObjectId;
      inventoryItemId: mongoose.Types.ObjectId;
      quantity: number;
    }[] = [];
    for (const row of items) {
      if (
        (row?.medicineId && !mongoose.isValidObjectId(row.medicineId)) ||
        !mongoose.isValidObjectId(row?.inventoryItemId) ||
        !Number.isInteger(row.quantity) ||
        row.quantity < 1 ||
        row.quantity > 100
      ) {
        return bad(
          res,
          400,
          "Each bill line needs a valid stock item and quantity",
        );
      }
      if (row.medicineId) {
        if (requested.has(row.medicineId))
          return bad(
            res,
            400,
            "A prescription item can only appear once per bill",
          );
        requested.add(row.medicineId);
        const medicine = consultation.medicines.find(
          (candidate: any) => candidate._id?.toString() === row.medicineId,
        );
        if (!medicine || medicine.isDispensed)
          return bad(
            res,
            400,
            "A selected medicine is not available on this prescription",
          );
      }
      normalized.push({
        ...(row.medicineId
          ? { medicineId: new mongoose.Types.ObjectId(row.medicineId) }
          : {}),
        inventoryItemId: new mongoose.Types.ObjectId(row.inventoryItemId),
        quantity: row.quantity,
      });
    }
    const unbilledPrescriptionIds = consultation.medicines
      .filter((medicine) => !medicine.isDispensed)
      .map((medicine: any) => medicine._id.toString());
    if (unbilledPrescriptionIds.some((id) => !requested.has(id))) {
      return bad(
        res,
        400,
        "Include every unbilled prescribed medicine in the pharmacy invoice",
      );
    }
    const inventoryIds = [
      ...new Set(normalized.map((row) => row.inventoryItemId.toString())),
    ];
    const stockItems = await Inventory.find({ _id: { $in: inventoryIds } });
    const stockById = new Map(
      stockItems.map((item) => [item._id.toString(), item]),
    );
    const quantities = new Map<string, number>();
    for (const row of normalized)
      quantities.set(
        row.inventoryItemId.toString(),
        (quantities.get(row.inventoryItemId.toString()) || 0) + row.quantity,
      );
    for (const [id, quantity] of quantities) {
      const stock = stockById.get(id);
      if (!stock || stock.unitPrice <= 0)
        return bad(
          res,
          400,
          "A selected stock item has no valid price; update it in Admin inventory first",
        );
      const available = stock.currentStock - (stock.reservedStock || 0);
      if (available < quantity)
        return bad(
          res,
          409,
          `${stock.itemName} has only ${Math.max(0, available)} ${stock.unit} available`,
        );
    }
    const saleItems = normalized.map((row) => {
      const stock = stockById.get(row.inventoryItemId.toString())!;
      const medicine = row.medicineId
        ? consultation.medicines.find(
            (candidate: any) =>
              candidate._id?.toString() === row.medicineId!.toString(),
          )
        : undefined;
      return {
        ...(row.medicineId ? { medicineId: row.medicineId } : {}),
        inventoryItem: stock._id,
        name: medicine?.name || stock.itemName,
        quantity: row.quantity,
        unitPrice: stock.unitPrice,
        amount: Math.round(stock.unitPrice * row.quantity * 100) / 100,
      };
    });
    const totalAmount =
      Math.round(saleItems.reduce((sum, item) => sum + item.amount, 0) * 100) /
      100;
    if (totalAmount <= 0)
      return bad(res, 400, "The bill total must be greater than zero");

    for (const [id, quantity] of quantities) {
      const result = await Inventory.updateOne(
        {
          _id: id,
          $expr: {
            $gte: [
              {
                $subtract: [
                  "$currentStock",
                  { $ifNull: ["$reservedStock", 0] },
                ],
              },
              quantity,
            ],
          },
        },
        { $inc: { reservedStock: quantity } },
      );
      if (result.modifiedCount !== 1) {
        for (const row of reserved)
          await Inventory.updateOne(
            { _id: row.id },
            { $inc: { reservedStock: -row.quantity } },
          );
        reserved.length = 0;
        return bad(
          res,
          409,
          "Stock changed while this bill was being prepared. Refresh and try again.",
        );
      }
      reserved.push({ id: new mongoose.Types.ObjectId(id), quantity });
    }

    const invoice = await Invoice.create({
      patient: consultation.patient,
      issuedBy: req.user?._id,
      appointment: consultation.appointment,
      items: saleItems.map((item) => ({
        description: `${item.name} × ${item.quantity}`,
        amount: item.amount,
      })),
      totalAmount,
      paidAmount: 0,
      status: InvoiceStatus.PENDING,
      payer: "self",
      insuranceCoverage: 0,
    });
    let sale: any;
    try {
      sale = await PharmacySale.create({
        consultation: consultation._id,
        patient: consultation.patient,
        invoice: invoice._id,
        pharmacist: req.user?._id,
        items: saleItems,
        totalAmount,
        status: "AWAITING_PAYMENT",
      });
      invoice.pharmacySale = sale._id;
      await invoice.save();
    } catch (error) {
      if (sale?._id) await PharmacySale.deleteOne({ _id: sale._id });
      await Invoice.findByIdAndDelete(invoice._id);
      throw error;
    }
    billCommitted = true;
    getIO()?.emit("invoice_created", { invoice });
    res
      .status(201)
      .json({ success: true, message: "Bill sent to patient", invoice, sale });
  } catch (error) {
    if (!billCommitted) {
      for (const row of reserved)
        await Inventory.updateOne(
          { _id: row.id },
          { $inc: { reservedStock: -row.quantity } },
        ).catch(() => undefined);
    }
    if ((error as any)?.code === 11000) {
      const currentSale = await PharmacySale.findOne({
        consultation: req.params.consultationId,
      }).populate("invoice", "status totalAmount paidAmount");
      if (currentSale)
        return res
          .status(409)
          .json({
            success: false,
            message: "This prescription already has a pharmacy sale",
            sale: currentSale,
          });
    }
    console.error("createPharmacyBill failed", error);
    bad(res, 500, "Unable to create pharmacy bill");
  }
};

export const recordPharmacyCashPayment = async (
  req: Request,
  res: Response,
) => {
  try {
    const { saleId } = req.params;
    if (!mongoose.isValidObjectId(saleId))
      return bad(res, 400, "Invalid sale ID");
    const sale = await PharmacySale.findById(saleId);
    if (!sale) return bad(res, 404, "Pharmacy sale not found");
    if (sale.status === "DISPENSED")
      return res.json({
        success: true,
        sale,
        message: "Sale is already dispensed",
      });
    const invoice = await Invoice.findOneAndUpdate(
      {
        _id: sale.invoice,
        status: { $in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL] },
        $expr: {
          $lt: [
            {
              $add: [
                { $ifNull: ["$paidAmount", 0] },
                { $ifNull: ["$insuranceCoverage", 0] },
              ],
            },
            "$totalAmount",
          ],
        },
      },
      [
        {
          $set: {
            paidAmount: "$totalAmount",
            status: InvoiceStatus.PAID,
            paymentMethod: InvoicePaymentMethod.CASH,
            paidAt: new Date(),
            paymentHistory: {
              $concatArrays: [
                { $ifNull: ["$paymentHistory", []] },
                [
                  {
                    amount: {
                      $subtract: [
                        "$totalAmount",
                        {
                          $add: [
                            { $ifNull: ["$paidAmount", 0] },
                            { $ifNull: ["$insuranceCoverage", 0] },
                          ],
                        },
                      ],
                    },
                    method: InvoicePaymentMethod.CASH,
                    source: "RECEPTION",
                    recordedBy: req.user?._id,
                    paidAt: new Date(),
                  },
                ],
              ],
            },
          },
        },
      ],
      { new: true },
    );
    const verifiedInvoice = invoice || (await Invoice.findById(sale.invoice));
    if (
      !verifiedInvoice ||
      verifiedInvoice.status !== InvoiceStatus.PAID ||
      (verifiedInvoice.paidAmount || 0) +
        (verifiedInvoice.insuranceCoverage || 0) <
        verifiedInvoice.totalAmount
    ) {
      return bad(
        res,
        409,
        "Invoice is not fully paid; refresh the sale before recording cash",
      );
    }
    getIO()?.emit("invoice_paid", { invoiceId: verifiedInvoice._id });
    getIO()?.emit("invoice_updated", { invoiceId: verifiedInvoice._id });
    getIO()?.emit("admin:data_changed", { types: ["invoices", "billing"] });
    res.json({ success: true, invoice: verifiedInvoice, sale });
  } catch (error) {
    console.error("recordPharmacyCashPayment failed", error);
    bad(res, 500, "Unable to record pharmacy cash payment");
  }
};

export const dispensePharmacySale = async (req: Request, res: Response) => {
  const changedStock: { id: mongoose.Types.ObjectId; quantity: number }[] = [];
  let saleId: mongoose.Types.ObjectId | undefined;
  let consultationForRollback: any = null;
  let medicineIdsForRollback: string[] = [];
  try {
    const rawSaleId = String(req.params.saleId || "");
    if (!mongoose.isValidObjectId(rawSaleId))
      return bad(res, 400, "Invalid sale ID");
    saleId = new mongoose.Types.ObjectId(rawSaleId);
    const sale = await PharmacySale.findOneAndUpdate(
      { _id: saleId, status: "AWAITING_PAYMENT" },
      { $set: { status: "DISPENSING" } },
      { new: true },
    );
    if (!sale) {
      const current = await PharmacySale.findById(saleId);
      if (current?.status === "DISPENSED")
        return res.json({
          success: true,
          message: "Sale was already dispensed",
          sale: current,
        });
      if (!current) return bad(res, 404, "Pharmacy sale not found");
      return bad(
        res,
        409,
        "This sale is already being processed; refresh and try again",
      );
    }
    const invoice = await Invoice.findById(sale.invoice);
    if (
      !invoice ||
      invoice.status !== InvoiceStatus.PAID ||
      (invoice.paidAmount || 0) + (invoice.insuranceCoverage || 0) <
        invoice.totalAmount
    ) {
      await PharmacySale.updateOne(
        { _id: sale._id, status: "DISPENSING" },
        { $set: { status: "AWAITING_PAYMENT" } },
      );
      return bad(res, 409, "The invoice must be fully paid before dispensing");
    }
    for (const item of sale.items) {
      const result = await Inventory.updateOne(
        {
          _id: item.inventoryItem,
          currentStock: { $gte: item.quantity },
          reservedStock: { $gte: item.quantity },
        },
        {
          $inc: { currentStock: -item.quantity, reservedStock: -item.quantity },
        },
      );
      if (result.modifiedCount !== 1)
        throw new Error(`Insufficient stock for ${item.name}`);
      changedStock.push({ id: item.inventoryItem, quantity: item.quantity });
    }
    const consultation = await Consultation.findById(sale.consultation);
    if (!consultation) throw new Error("Prescription no longer exists");
    consultationForRollback = consultation;
    medicineIdsForRollback = sale.items.flatMap((item) =>
      item.medicineId ? [item.medicineId.toString()] : [],
    );
    for (const item of sale.items) {
      if (!item.medicineId) continue;
      const medicine = consultation.medicines.find(
        (candidate: any) =>
          candidate._id?.toString() === item.medicineId!.toString(),
      );
      if (!medicine || medicine.isDispensed)
        throw new Error("Prescription changed after billing; review this sale");
      medicine.isDispensed = true;
    }
    await consultation.save();
    sale.status = "DISPENSED";
    sale.dispensedBy = req.user?._id;
    sale.dispensedAt = new Date();
    await sale.save();
    getIO()?.emit("prescription_dispensed", {
      consultationId: consultation._id,
      saleId: sale._id,
    });
    getIO()?.emit("admin:data_changed", { types: ["inventory"] });
    getIO()?.emit("inventory_updated");
    res.json({ success: true, message: "Paid pharmacy sale dispensed", sale });
  } catch (error) {
    for (const row of changedStock)
      await Inventory.updateOne(
        { _id: row.id },
        { $inc: { currentStock: row.quantity, reservedStock: row.quantity } },
      ).catch(() => undefined);
    if (consultationForRollback) {
      for (const medicine of consultationForRollback.medicines as any[]) {
        if (medicineIdsForRollback.includes(medicine._id?.toString()))
          medicine.isDispensed = false;
      }
      await consultationForRollback.save().catch(() => undefined);
    }
    if (saleId)
      await PharmacySale.updateOne(
        { _id: saleId, status: "DISPENSING" },
        { $set: { status: "AWAITING_PAYMENT" } },
      ).catch(() => undefined);
    console.error("dispensePharmacySale failed", error);
    bad(
      res,
      409,
      error instanceof Error ? error.message : "Unable to dispense this sale",
    );
  }
};
