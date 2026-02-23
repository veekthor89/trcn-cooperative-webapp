import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Eye, Upload, X, FileText, Megaphone, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const CATEGORIES = [
  { value: "meeting", label: "Meeting", color: "bg-blue-100 text-blue-800" },
  { value: "dividend", label: "Dividend", color: "bg-green-100 text-green-800" },
  { value: "policy_update", label: "Policy Update", color: "bg-orange-100 text-orange-800" },
  { value: "general_news", label: "General News", color: "bg-gray-100 text-gray-800" },
  { value: "urgent_alert", label: "Urgent Alert", color: "bg-red-100 text-red-800" },
];

const PRIORITIES = [
  { value: "normal", label: "Normal" },
  { value: "important", label: "Important" },
  { value: "urgent", label: "Urgent" },
];

const AUDIENCES = [
  { value: "all_members", label: "All Members" },
  { value: "active_loans", label: "Members with Active Loans" },
  { value: "shareholders", label: "Shareholders Only" },
  { value: "special_contributions", label: "Members with Special Contributions" },
];

const getCategoryBadge = (category: string) => {
  const cat = CATEGORIES.find(c => c.value === category);
  return cat ? <Badge className={cat.color}>{cat.label}</Badge> : <Badge>{category}</Badge>;
};

const getPriorityBadge = (priority: string) => {
  if (priority === "urgent") return <Badge className="bg-red-600 text-white">Urgent !</Badge>;
  if (priority === "important") return <Badge className="bg-yellow-100 text-yellow-800">Important</Badge>;
  return null;
};

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewAnnouncement, setViewAnnouncement] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});
  const [totalMembers, setTotalMembers] = useState(0);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general_news");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [targetAudience, setTargetAudience] = useState("all_members");
  const [publishOption, setPublishOption] = useState("publish_now");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    fetchTotalMembers();
  }, []);

  const fetchTotalMembers = async () => {
    const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
    setTotalMembers(count || 0);
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);

      // Fetch read counts
      if (data && data.length > 0) {
        const counts: Record<string, number> = {};
        for (const ann of data) {
          const { count } = await supabase
            .from("announcement_reads")
            .select("id", { count: "exact", head: true })
            .eq("announcement_id", ann.id);
          counts[ann.id] = count || 0;
        }
        setReadCounts(counts);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setCategory("general_news");
    setMessage("");
    setPriority("normal");
    setTargetAudience("all_members");
    setPublishOption("publish_now");
    setAttachment(null);
    setEditingId(null);
  };

  const openEditForm = (ann: any) => {
    setTitle(ann.title);
    setCategory(ann.category);
    setMessage(ann.message);
    setPriority(ann.priority);
    setTargetAudience(ann.target_audience);
    setPublishOption(ann.status === "published" ? "publish_now" : "save_draft");
    setEditingId(ann.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim() || !category) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (title.length > 100) {
      toast.error("Title must be 100 characters or less");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let attachmentUrl = null;
      let attachmentName = null;

      if (attachment) {
        if (attachment.size > 5 * 1024 * 1024) {
          toast.error("File size must be less than 5MB");
          setSubmitting(false);
          return;
        }
        const ext = attachment.name.split(".").pop();
        const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("announcement-attachments")
          .upload(filePath, attachment);
        if (uploadError) throw uploadError;
        attachmentUrl = filePath;
        attachmentName = attachment.name;
      }

      const status = publishOption === "publish_now" ? "published" : "draft";
      const announcementData: any = {
        title: title.trim(),
        message: message.trim(),
        category,
        priority,
        target_audience: targetAudience,
        status,
        ...(attachmentUrl && { attachment_url: attachmentUrl, attachment_name: attachmentName }),
        ...(status === "published" && { published_at: new Date().toISOString() }),
      };

      if (editingId) {
        const { error } = await supabase.from("announcements").update(announcementData).eq("id", editingId);
        if (error) throw error;
        toast.success("Announcement updated successfully!");
      } else {
        announcementData.created_by = session.user.id;
        const { error } = await supabase.from("announcements").insert(announcementData);
        if (error) throw error;

        // Send notifications if publishing
        if (status === "published") {
          await sendNotifications(session.user.id, title.trim(), targetAudience);
        }
        toast.success(status === "published" 
          ? "Announcement published successfully!" 
          : "Announcement saved as draft!");
      }

      resetForm();
      setShowForm(false);
      fetchAnnouncements();
    } catch (error: any) {
      console.error("Error saving announcement:", error);
      toast.error(error.message || "Failed to save announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const sendNotifications = async (createdBy: string, announcementTitle: string, audience: string) => {
    try {
      let userIds: string[] = [];

      if (audience === "all_members") {
        const { data } = await supabase.from("profiles").select("id");
        userIds = data?.map(p => p.id) || [];
      } else if (audience === "active_loans") {
        const { data } = await supabase.from("loans").select("user_id").eq("status", "active");
        userIds = [...new Set(data?.map(l => l.user_id) || [])];
      } else if (audience === "shareholders") {
        const { data } = await supabase.from("shares").select("user_id").gt("total_shares", 0);
        userIds = data?.map(s => s.user_id) || [];
      } else if (audience === "special_contributions") {
        const { data } = await supabase.from("special_contributions").select("user_id").in("application_status", ["active", "approved"]);
        userIds = [...new Set(data?.map(c => c.user_id) || [])];
      }

      // Remove the creator from notifications
      userIds = userIds.filter(id => id !== createdBy);

      if (userIds.length > 0) {
        const notifications = userIds.map(userId => ({
          user_id: userId,
          type: "announcement",
          message: `New announcement: "${announcementTitle}"`,
        }));

        // Insert in batches of 100
        for (let i = 0; i < notifications.length; i += 100) {
          const batch = notifications.slice(i, i + 100);
          await supabase.from("notifications").insert(batch);
        }
      }
    } catch (error) {
      console.error("Error sending notifications:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Announcement deleted");
      setDeleteId(null);
      fetchAnnouncements();
    } catch (error) {
      toast.error("Failed to delete announcement");
    }
  };

  const getAttachmentUrl = async (path: string) => {
    const { data } = await supabase.storage.from("announcement-attachments").createSignedUrl(path, 3600);
    return data?.signedUrl;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Announcements</h1>
            <p className="text-muted-foreground mt-1">Manage communications to members</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" /> Create Announcement
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Megaphone className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{announcements.filter(a => a.status === "published").length}</p>
                  <p className="text-sm text-muted-foreground">Published</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{announcements.filter(a => a.status === "draft").length}</p>
                  <p className="text-sm text-muted-foreground">Drafts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{totalMembers}</p>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Announcements Table */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No announcements yet. Create your first one!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Read</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((ann) => (
                      <TableRow key={ann.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{ann.title}</TableCell>
                        <TableCell>{getCategoryBadge(ann.category)}</TableCell>
                        <TableCell>{getPriorityBadge(ann.priority) || <span className="text-muted-foreground text-sm">Normal</span>}</TableCell>
                        <TableCell className="text-sm">{AUDIENCES.find(a => a.value === ann.target_audience)?.label}</TableCell>
                        <TableCell>
                          <Badge variant={ann.status === "published" ? "default" : "secondary"}>
                            {ann.status === "published" ? "Published" : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {ann.status === "published" ? (
                            <span>{readCounts[ann.id] || 0} / {totalMembers}</span>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(ann.published_at || ann.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setViewAnnouncement(ann)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditForm(ann)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(ann.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { resetForm(); setShowForm(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{editingId ? "Edit Announcement" : "Create New Announcement"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
            <div className="space-y-5 pt-2">
              <div>
                <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} placeholder="Announcement title" />
                <p className="text-xs text-muted-foreground mt-1">{title.length}/100 characters</p>
              </div>

              <div>
                <Label>Category <span className="text-destructive">*</span></Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="message">Message <span className="text-destructive">*</span></Label>
                <Textarea id="message" value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your announcement message..." className="min-h-[150px]" />
              </div>

              <div>
                <Label>Priority Level</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Target Audience</Label>
                <Select value={targetAudience} onValueChange={setTargetAudience}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Publish Options</Label>
                <RadioGroup value={publishOption} onValueChange={setPublishOption} className="mt-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="publish_now" id="publish_now" />
                    <Label htmlFor="publish_now" className="font-normal">Publish Now</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="save_draft" id="save_draft" />
                    <Label htmlFor="save_draft" className="font-normal">Save as Draft</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Attachment (optional, max 5MB)</Label>
                {attachment ? (
                  <div className="flex items-center gap-2 mt-2 p-3 border rounded-lg bg-muted/50">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm flex-1 truncate">{attachment.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => setAttachment(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload (PDF, JPG, PNG, DOCX)</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.docx"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error("File must be less than 5MB");
                              return;
                            }
                            setAttachment(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-primary hover:bg-primary/90">
                  {submitting ? "Saving..." : editingId ? "Update Announcement" : publishOption === "publish_now" ? "Publish" : "Save Draft"}
                </Button>
                <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* View Announcement Dialog */}
      <Dialog open={!!viewAnnouncement} onOpenChange={() => setViewAnnouncement(null)}>
        <DialogContent className="max-w-2xl">
          {viewAnnouncement && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{viewAnnouncement.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {getCategoryBadge(viewAnnouncement.category)}
                  {getPriorityBadge(viewAnnouncement.priority)}
                  <Badge variant={viewAnnouncement.status === "published" ? "default" : "secondary"}>
                    {viewAnnouncement.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {viewAnnouncement.published_at
                    ? `Published: ${new Date(viewAnnouncement.published_at).toLocaleString()}`
                    : `Created: ${new Date(viewAnnouncement.created_at).toLocaleString()}`}
                </p>
                <p className="text-sm">
                  <strong>Audience:</strong> {AUDIENCES.find(a => a.value === viewAnnouncement.target_audience)?.label}
                </p>
                {viewAnnouncement.status === "published" && (
                  <p className="text-sm text-muted-foreground">
                    Read by {readCounts[viewAnnouncement.id] || 0} of {totalMembers} members
                    ({totalMembers > 0 ? Math.round(((readCounts[viewAnnouncement.id] || 0) / totalMembers) * 100) : 0}%)
                  </p>
                )}
                <div className="border-t pt-4 whitespace-pre-wrap text-sm">{viewAnnouncement.message}</div>
                {viewAnnouncement.attachment_url && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const url = await getAttachmentUrl(viewAnnouncement.attachment_url);
                      if (url) window.open(url, "_blank");
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {viewAnnouncement.attachment_name || "Download Attachment"}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default AdminAnnouncements;
