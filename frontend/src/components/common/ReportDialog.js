import React, { useState } from 'react';
import axios from 'axios';
import { API, useAuth } from '@/App';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';

const ReportDialog = ({ targetId, targetType, trigger }) => {
    const { user, token } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast.error('Please login to report content');
            return;
        }
        if (!reason) {
            toast.error('Please select a reason');
            return;
        }

        setLoading(true);
        try {
            await axios.post(
                `${API}/reports`,
                {
                    targetId,
                    targetType,
                    reason,
                    description
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            toast.success('Report submitted successfully');
            setOpen(false);
            setReason('');
            setDescription('');
        } catch (error) {
            toast.error('Failed to submit report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-500">
                        <Flag className="h-4 w-4 mr-2" />
                        Report
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
                <DialogHeader>
                    <DialogTitle>Report Content</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Reason</Label>
                        <Select onValueChange={setReason} required>
                            <SelectTrigger className="bg-[#0a0a0a] border-gray-700">
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-gray-800 text-white">
                                <SelectItem value="spam">Spam</SelectItem>
                                <SelectItem value="harassment">Harassment</SelectItem>
                                <SelectItem value="misinformation">Misinformation</SelectItem>
                                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Description (Optional)</Label>
                        <Textarea
                            placeholder="Provide more details..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-[#0a0a0a] border-gray-700"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="destructive" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Report'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ReportDialog;
