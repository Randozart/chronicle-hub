// src/hooks/useCreatorForm.ts
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/providers/ToastProvider';

export interface FormGuard {
    isDirty: boolean;
    save: () => Promise<boolean>;
}

export function useCreatorForm<T extends { id: string; version?: number }>(
    initialData: T | null,
    saveEndpoint: string,
    extraBodyParams: Record<string, any> = {},
    guardRef?: { current: FormGuard | null }, 
    customSave?: () => Promise<any> 
) {
    const [data, setData] = useState<T | null>(initialData);
    const [originalData, setOriginalData] = useState<T | null>(initialData);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        if (initialData) {
            setData(JSON.parse(JSON.stringify(initialData)));
            setOriginalData(JSON.parse(JSON.stringify(initialData)));
            setIsDirty(false);
        }
    }, [initialData]);

    const handleChange = useCallback((field: keyof T, value: any) => {
        setData(prev => {
            if (!prev) return null;
            const next = { ...prev, [field]: value };
            setIsDirty(JSON.stringify(next) !== JSON.stringify(originalData));
            return next;
        });
    }, [originalData]);

    const handleSave = useCallback(async () => {
        if (!data) return false;
        setIsSaving(true);
        try {
            const res = await fetch(saveEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...extraBodyParams, data: data })
            });

            if (res.status === 409) {
                showToast("Conflict: Data changed on server. Please reload.", "error");
                setIsSaving(false);
                return false;
            }

            if (!res.ok) throw new Error("Save failed");

            const responseData = await res.json();
            const savedData = { 
                ...data, 
                version: responseData.newVersion || (data.version || 0) + 1 
            };

            setOriginalData(JSON.parse(JSON.stringify(savedData)));
            setData(savedData);
            setIsDirty(false);
            setLastSaved(new Date());
            showToast("Saved successfully", "success");
            return true;
        } catch (e) {
            console.error(e);
            showToast("Error saving changes", "error");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [data, extraBodyParams, saveEndpoint, showToast]);

    const resetState = useCallback(() => {
        if (data) {
            setOriginalData(JSON.parse(JSON.stringify(data)));
            setIsDirty(false);
            setLastSaved(new Date());
        }
    }, [data]);

    const revertChanges = useCallback(() => {
        if (originalData) {
            setData(JSON.parse(JSON.stringify(originalData)));
            setIsDirty(false);
            showToast("Changes discarded.", "info");
        }
    }, [originalData, showToast]);
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);
    useEffect(() => {
        if (guardRef) {
            guardRef.current = {
                isDirty,
                save: handleSave
            };
        }
    }, [isDirty, handleSave, guardRef]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (isDirty) {

                    if (customSave) {
                        customSave();
                    } else {
                        handleSave();
                    }
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isDirty, handleSave, customSave]); 


    return {
        data,
        setData,
        handleChange,
        handleSave,
        revertChanges,
        resetState, 
        isDirty,
        isSaving,
        lastSaved
    };
}