import { useEffect, useState } from "react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, FileText, Activity, Save } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import Image from "next/image";

export function ProfilePanel() {
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  
  const [department, setDepartment] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [degree, setDegree] = useState("");
  const [bio, setBio] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    // Load doctor profile data
    apiClient.get("/doctor/profile")
      .then((res: any) => {
          if (res.data?.status === "success") {
          const prof = res.data.data.profile;
          const usr = res.data.data.user;
          if (usr?.name) setName(usr.name);
          if (usr?.phone) setPhone(usr.phone);
          if (prof?.department) setDepartment(prof.department);
          if (prof?.specialization) setSpecialization(prof.specialization);
          if (prof?.degree) setDegree(prof.degree);
          if (prof?.bio) setBio(prof.bio);
          if (prof?.experienceYears !== undefined) setExperienceYears(String(prof.experienceYears));
          if (prof?.licenseNumber) setLicenseNumber(prof.licenseNumber);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file.");
        return;
      }
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const formData = new FormData();
      formData.append("department", department);
      formData.append("specialization", specialization);
      formData.append("degree", degree);
      formData.append("bio", bio);
      formData.append("name", name);
      formData.append("phone", phone);
      formData.append("experienceYears", experienceYears);
      formData.append("licenseNumber", licenseNumber);
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await apiClient.put("/doctor/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      const resData = res.data as any;
      if (resData.status === "success") {
        toast.success("Profile updated successfully!");
        if (resData.data.user) {
          updateUser(resData.data.user);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="pb-24">
      <PanelHeader
        index="08 / profile"
        title="My Professional Profile"
        note="Manage your public avatar, clinical details, and department association."
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-6 lg:space-y-8">
          
          <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden">
            <div className="h-1.5 w-full bg-primary" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="size-5 text-primary" />
                <CardTitle className="text-base font-semibold">Avatar & Identification</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-6">
                  <div className="relative size-24 shrink-0 rounded-full bg-muted border border-border/40 overflow-hidden flex items-center justify-center text-muted-foreground/50">
                    {avatarPreview ? (
                      <Image src={avatarPreview} alt="Preview" fill className="object-cover" />
                    ) : user?.avatarUrl ? (
                      <Image src={user.avatarUrl} alt="Avatar" fill className="object-cover" />
                    ) : (
                      <UserCheck className="size-10" />
                    )}
                  </div>
                  <div>
                    <label htmlFor="avatar-upload" className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2">
                      Upload new photo
                    </label>
                    <input 
                      id="avatar-upload"
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <p className="text-[10px] text-muted-foreground mt-2">JPG, GIF or PNG. 1MB max.</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="e.g. Dr. Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Activity className="size-5 text-primary" />
                <CardTitle className="text-base font-semibold">Clinical Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g. Cardiology"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">License Number</label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g. MED-12345"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Specialization</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g. Interventional Cardiology"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Years of Experience</label>
                <input
                  type="number"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g. 10"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Medical Degree</label>
                <input
                  type="text"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g. MBBS, MD"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-medium">Professional Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full flex min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Brief summary of your expertise and experience..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4 pb-12">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 py-2"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
