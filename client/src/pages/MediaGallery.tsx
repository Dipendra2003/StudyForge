import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Attachment } from '@shared/schema';
import { apiGet, apiDelete, apiPatch, fetchWithAuth } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Image as ImageIcon, FileText, Download, Loader2, Search, Filter, X, ArrowUpDown } from 'lucide-react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Settings } from 'lucide-react';

export default function MediaGallery() {
  const { user } = useAuth();
  const [lightboxImage, setLightboxImage] = useState<{src: string, alt: string} | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<{url: string, name: string} | null>(null);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'document'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: attachments, isLoading } = useQuery<Attachment[]>({
    queryKey: ['/api/attachments'],
    queryFn: async () => {
      const res = await apiGet('/api/attachments');
      if (!res.ok) throw new Error('Failed to fetch attachments');
      return res.json();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => apiDelete(`/api/attachments/${id}`)));
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Successfully deleted ${deleteIds.length} item(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attachments'] });
      setDeleteIds([]);
      setShowDeleteDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete one or more attachments",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    }
  });

  const retentionMutation = useMutation({
    mutationFn: async (days: number) => {
      const res = await apiPatch('/api/users/me/media-retention', { retentionDays: days });
      if (!res.ok) throw new Error('Failed to update setting');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your media auto-delete preference has been saved.",
      });
      // Optionally invalidate user query if you want to refresh the user object
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update storage settings.",
        variant: "destructive",
      });
    }
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewDocument = async (e: React.MouseEvent, url: string, name: string) => {
    e.stopPropagation();
    try {
      const baseUrl = url.split('?')[0];
      const response = await fetchWithAuth(baseUrl);
      
      if (!response.ok) throw new Error("Failed to fetch");
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPdfPreviewUrl({ url: blobUrl, name });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load document securely",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (e: React.MouseEvent, url: string, filename: string) => {
    e.stopPropagation();
    try {
      const baseUrl = url.split('?')[0];
      const response = await fetchWithAuth(baseUrl);
      
      if (!response.ok) throw new Error("Failed to fetch");
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL after download starts
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download document securely",
        variant: "destructive"
      });
    }
  };

  const toggleSelection = (id: number) => {
    setDeleteIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredAttachments = useMemo(() => {
    if (!attachments) return [];
    let filtered = [...attachments];
    
    if (filterType === 'image') {
      filtered = filtered.filter(a => a.mimeType.startsWith('image/'));
    } else if (filterType === 'document') {
      filtered = filtered.filter(a => !a.mimeType.startsWith('image/'));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => a.originalName.toLowerCase().includes(term));
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.originalName.localeCompare(b.originalName);
        case 'size':
          return b.size - a.size;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [attachments, filterType, searchTerm, sortBy]);

  const totalPages = Math.ceil(filteredAttachments.length / itemsPerPage);
  const currentItems = filteredAttachments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, sortBy, itemsPerPage]);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
              My Media
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage all your uploaded images and documents from chats.
            </p>
          </div>
          
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap md:justify-end w-full md:w-auto">
            {currentItems.length > 0 && (
              <Button
                variant={deleteIds.length === currentItems.length ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (deleteIds.length === currentItems.length) {
                    setDeleteIds([]);
                  } else {
                    setDeleteIds(currentItems.map(item => item.id));
                  }
                }}
                className="mr-2"
              >
                {deleteIds.length === currentItems.length ? "Deselect All" : "Select All"}
              </Button>
            )}

            {deleteIds.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="mr-2 animate-in fade-in w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({deleteIds.length})
              </Button>
            )}
            
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search files..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full sm:w-[150px] lg:w-[200px] h-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                <SelectTrigger className="h-9 w-full sm:w-[130px] text-xs">
                  <ArrowUpDown className="h-3 w-3 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="size">Largest Size</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 sm:border-l sm:pl-4 w-full sm:w-auto">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <Select 
                value={user?.mediaRetentionDays?.toString() || "0"} 
                onValueChange={(val) => retentionMutation.mutate(parseInt(val))}
                disabled={retentionMutation.isPending}
              >
                <SelectTrigger className="h-9 w-full sm:w-[140px] text-xs">
                  <SelectValue placeholder="Auto-delete" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Never Delete</SelectItem>
                  <SelectItem value="7">After 7 Days</SelectItem>
                  <SelectItem value="15">After 15 Days</SelectItem>
                  <SelectItem value="30">After 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button 
            variant={filterType === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilterType('all')}
            className="rounded-full"
          >
            All Media
          </Button>
          <Button 
            variant={filterType === 'image' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilterType('image')}
            className="rounded-full"
          >
            <ImageIcon className="h-4 w-4 mr-2" /> Images
          </Button>
          <Button 
            variant={filterType === 'document' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilterType('document')}
            className="rounded-full"
          >
            <FileText className="h-4 w-4 mr-2" /> Documents
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
          </div>
        ) : filteredAttachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-card/30 rounded-3xl border border-dashed border-primary/20 backdrop-blur-sm">
            <div className="p-6 bg-primary/10 rounded-full mb-6">
              {searchTerm || filterType !== 'all' ? <Filter className="h-12 w-12 text-primary/60" /> : <ImageIcon className="h-12 w-12 text-primary/60" />}
            </div>
            <h2 className="text-2xl font-semibold mb-2">No media found</h2>
            <p className="text-muted-foreground max-w-sm">
              {searchTerm || filterType !== 'all' ? "Try adjusting your filters or search term." : "Upload images and PDFs in the Chat to see them appear in your gallery."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              <AnimatePresence mode="popLayout">
                {currentItems.map((file, index) => {
                  const isSelected = deleteIds.includes(file.id);
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      layout
                    >
                      <Card 
                        className={`group relative overflow-hidden flex flex-col h-full bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-primary/10 hover:border-primary/30'}`}
                      >
                        {/* Checkbox Overlay */}
                        <div className="absolute top-2 left-2 z-10">
                          <div className={`bg-background/80 rounded-sm backdrop-blur-md transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={() => toggleSelection(file.id)}
                            />
                          </div>
                        </div>

                        {/* Media Preview Area */}
                        <div 
                          className="relative h-48 w-full bg-black/5 overflow-hidden flex items-center justify-center cursor-pointer"
                          onClick={(e) => {
                            if (file.mimeType.startsWith('image/')) {
                              setLightboxImage({ src: file.fileUrl, alt: file.originalName });
                            } else {
                              handleViewDocument(e, file.fileUrl, file.originalName);
                            }
                          }}
                        >
                          {file.mimeType.startsWith('image/') ? (
                            <img 
                              src={file.fileUrl} 
                              alt={file.originalName}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="relative w-full h-full group-hover:scale-110 transition-transform duration-500">
                              <img 
                                src={`${file.fileUrl}${file.fileUrl.includes('?') ? '&' : '?'}preview=true`} 
                                alt={file.originalName}
                                className="w-full h-full object-cover opacity-80"
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  const retries = parseInt(img.dataset.retries || '0');
                                  if (retries < 3) {
                                    img.dataset.retries = (retries + 1).toString();
                                    setTimeout(() => {
                                      img.src = `${file.fileUrl}${file.fileUrl.includes('?') ? '&' : '?'}preview=true&r=${retries + 1}`;
                                    }, 2500); // Wait 2.5s for Cloudinary to generate the thumbnail
                                  } else {
                                    // Fallback if PDF preview fails to generate
                                    img.style.display = 'none';
                                    const parent = img.parentElement;
                                    if (parent && !parent.querySelector('.pdf-fallback')) {
                                      const fallback = document.createElement('div');
                                      fallback.className = 'pdf-fallback absolute inset-0 flex flex-col items-center justify-center bg-primary/10 text-primary';
                                      fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text mb-4"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg><span class="font-semibold px-4 text-center truncate w-full text-sm">PDF Document</span>';
                                      parent.appendChild(fallback);
                                    }
                                  }
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80">
                                <div className="absolute bottom-2 right-2 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded shadow flex items-center">
                                  <FileText className="h-3 w-3 mr-1" /> PDF
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
                            {file.mimeType.startsWith('image/') ? (
                              <div className="text-white text-sm font-medium flex items-center gap-2">
                                <ImageIcon className="h-5 w-5" /> View
                              </div>
                            ) : (
                              <div className="text-white text-sm font-medium flex items-center gap-2">
                                <FileText className="h-5 w-5" /> Open
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Meta Data */}
                        <div className="p-4 flex flex-col flex-grow">
                          <h3 className="font-medium text-sm truncate mb-1" title={file.originalName}>
                            {file.originalName}
                          </h3>
                          <div className="flex justify-between items-center text-xs text-muted-foreground mt-auto">
                            <span>{formatFileSize(file.size)}</span>
                            <span>{format(new Date(file.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                        </div>

                        {/* Actions Menu */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-white/90 hover:bg-white text-black shadow-sm"
                            onClick={(e) => handleDownload(e, file.fileUrl, file.originalName)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 rounded-full shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteIds([file.id]);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {/* Pagination Controls */}
            {filteredAttachments.length > 0 && (
              <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Show</span>
                  <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(val) => setItemsPerPage(parseInt(val))}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>per page</span>
                </div>
                
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(prev => Math.max(1, prev - 1));
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink 
                          href="#" 
                          isActive={currentPage === i + 1}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(i + 1);
                          }}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(prev => Math.min(totalPages, prev + 1));
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      <ImageLightbox
        isOpen={!!lightboxImage}
        src={lightboxImage?.src || ''}
        alt={lightboxImage?.alt}
        onClose={() => setLightboxImage(null)}
      />

      {/* Document Viewer Modal */}
      <Dialog open={!!pdfPreviewUrl} onOpenChange={(open) => {
        if (!open) {
          if (pdfPreviewUrl?.url.startsWith('blob:')) {
            URL.revokeObjectURL(pdfPreviewUrl.url);
          }
          setPdfPreviewUrl(null);
        }
      }}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-md flex flex-col">
          <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between sticky top-0 bg-background z-10 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              <span className="truncate max-w-xl">{pdfPreviewUrl?.name}</span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => {
                if (pdfPreviewUrl?.url.startsWith('blob:')) {
                  URL.revokeObjectURL(pdfPreviewUrl.url);
                }
                setPdfPreviewUrl(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="w-full h-full flex-grow relative bg-black/5">
            {pdfPreviewUrl && (
              <iframe 
                src={pdfPreviewUrl.url}
                className="absolute inset-0 w-full h-full border-0"
                title={pdfPreviewUrl.name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteIds.length} item(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. These files will be permanently deleted from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteIds)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
