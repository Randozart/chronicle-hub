'use client';

import { useState, useEffect } from 'react';
import GameModal from './GameModal';
import { useToast } from '@/providers/ToastProvider';
import { useSession } from 'next-auth/react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialSubject?: string;
}

export default function ContactModal({ isOpen, onClose, initialSubject = "" }: Props) {
    const { showToast } = useToast();
    const { data: session } = useSession(); // Get session
    const [subject, setSubject] = useState(initialSubject);
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState(""); 
    const [isSending, setIsSending] = useState(false);

    // Pre-fill subject when modal opens
    useEffect(() => {
        if (isOpen) {
            setSubject(initialSubject || "");
        }
    }, [isOpen, initialSubject]);

    const handleSubmit = async () => {
        if (!message.trim() || (!session && !email.trim())) {
            showToast("Please fill in all fields.", "error");
            return;
        }
        
        setIsSending(true);
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, message, email })
            });
            
            if (res.ok) {
                const data = await res.json();
                showToast(`Message sent! A confirmation has been sent to ${data.emailSentTo || "your email"}.`, "success");
                onClose();
                setMessage("");
                setEmail(""); // Clear email field
            } else {
                showToast("Failed to send message.", "error");
            }
        } catch (e) {
            showToast("Network error.", "error");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <GameModal
            isOpen={isOpen}
            title="Contact Support"
            onClose={onClose}
            onConfirm={handleSubmit}
            confirmLabel={isSending ? "Sending..." : "Send Message"}
            message={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                    
                    {!session && (
                        <div>
                            <label className="form-label" style={{display:'block', marginBottom:'5px', fontSize:'0.85rem'}}>Your Email*</label>
                            <input 
                                type="email"
                                className="form-input"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="So we can reply to you"
                                style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-item)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                    )}

                    <div>
                        <label className="form-label" style={{display:'block', marginBottom:'5px', fontSize:'0.85rem'}}>Subject</label>
                        <select 
                            className="form-select" 
                            value={subject} 
                            onChange={e => setSubject(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-item)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                        >
                            <option value="">-- Select Topic --</option>
                            <option value="StoryNexus Revival Project">StoryNexus Revival Project</option>
                            <option value="Bug Report">Bug Report</option>
                            <option value="Account Issue">Account Issue</option>
                            <option value="Content Complaint">Content Complaint / Report Abuse</option>
                            <option value="Feedback">Feedback</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="form-label" style={{display:'block', marginBottom:'5px', fontSize:'0.85rem'}}>Message*</label>
                        <textarea 
                            className="form-textarea"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={5}
                            placeholder="Describe your issue or inquiry..."
                            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-item)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                        />
                    </div>
                </div>
            }
        />
    );
}