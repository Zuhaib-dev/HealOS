import apiClient from "../api-client";

export interface CreateOrderPayload {
  amount: number;
  receipt?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  order: {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: string;
    attempts: number;
    created_at: number;
  };
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  appointmentId?: string;
  invoiceId?: string;
}

export const createRazorpayOrderApi = async (payload: CreateOrderPayload) => {
  const response = await apiClient.post<CreateOrderResponse>("/payment/create-order", payload);
  return response.data;
};

export const verifyRazorpayPaymentApi = async (payload: VerifyPaymentPayload) => {
  const response = await apiClient.post<{ success: boolean; message: string }>("/payment/verify", payload);
  return response.data;
};
