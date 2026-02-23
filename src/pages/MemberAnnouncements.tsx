import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Megaphone, FileText, AlertTriangle, ChevronLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "meeting", label: "Meeting", color: "bg-blue-100 text-blue-800" },
  { value: "dividend", label: "Dividend", color: "bg-green-100 text-green-800" },
  { value: "policy_update", label: "Policy Update", color: "bg-orange-100 text-orange-800" },
  { value: "general_news", label: "General News", color: "bg-gray-100 text-gray-800" },
  { value: "urgent_alert", label: "Urgent Alert", color: "bg-red-100 text-red-800" },
];

const getCategoryBadge = (category: string) => {
  const cat = CATEGORIES.find(c => c.value === category);
  return cat ? <Badge className={cat.color}>{cat.label}</Badge> : <Badge>{category}</Badge>;
};

const getPriorityBadge = (priority: string) => {
  if (priority === "urgent") return <Badge className="bg-red-600 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Urgent</Badge>;
  if (priority === "important") return <Badge className="bg-yellow-100 text-yellow-800">Important</Badge>;
  return null;
};

const MemberAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);

      // Fetch user's reads
      const { data: reads } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", session.user.id);
      setReadIds(new Set(reads?.map(r => r.announcement_id) || []));
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (announcementId: string) => {
    if (readIds.has(announcementId)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.from("announcement_reads").insert({
        announcement_id: announcementId,
        user_id: session.user.id,
      });
      setReadIds(prev => new Set([...prev, announcementId]));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const openAnnouncement = (ann: any) => {
    setSelectedAnnouncement(ann);
    markAsRead(ann.id);
  };

  const getAttachmentUrl = async (path: string) => {
    const { data } = await supabase.storage.from("announcement-attachments").createSignedUrl(path, 3600);
    return data?.signedUrl;
  };

  const filtered = announcements
    .filter(a => categoryFilter === "all" || a.category === categoryFilter)
    .sort((a, b) => {
      const dateA = new Date(a.published_at).getTime();
      const dateB = new Date(b.published_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Announcements</h1>
          <p className="text-muted-foreground mt-1">Stay up to date with cooperative news</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Announcement Cards */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No announcements found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((ann) => {
              const isUnread = !readIds.has(ann.id);
              return (
                <Card
                  key={ann.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    isUnread ? "border-primary/40 bg-primary/5" : ""
                  } ${ann.priority === "urgent" ? "border-red-300 bg-red-50/50" : ""}`}
                  onClick={() => openAnnouncement(ann)}
                >
                  <CardContent className="pt-5 pb-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-2 flex-wrap items-center">
                          {isUnread && <Badge className="bg-blue-600 text-white text-[10px] px-1.5">NEW</Badge>}
                          {getPriorityBadge(ann.priority)}
                          {getCategoryBadge(ann.category)}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(ann.published_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{ann.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{ann.message}</p>
                      <div className="flex items-center justify-between">
                        <Button variant="link" className="p-0 h-auto text-primary">Read More →</Button>
                        {ann.attachment_url && (
                          <Badge variant="outline" className="text-xs"><FileText className="h-3 w-3 mr-1" />Attachment</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Announcement Detail Dialog */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
          {selectedAnnouncement && (
            <>
              <DialogHeader className="px-6 pt-6">
                <div className="flex gap-2 flex-wrap mb-2">
                  {getPriorityBadge(selectedAnnouncement.priority)}
                  {getCategoryBadge(selectedAnnouncement.category)}
                </div>
                <DialogTitle className="text-xl">{selectedAnnouncement.title}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Published {new Date(selectedAnnouncement.published_at).toLocaleDateString("en-US", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric"
                  })}
                </p>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-160px)] px-6 pb-6">
                <div className="whitespace-pre-wrap text-sm leading-relaxed pt-4">{selectedAnnouncement.message}</div>
                {selectedAnnouncement.attachment_url && (
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const url = await getAttachmentUrl(selectedAnnouncement.attachment_url);
                      if (url) window.open(url, "_blank");
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {selectedAnnouncement.attachment_name || "Download Attachment"}
                  </Button>
                )}
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MemberAnnouncements;
