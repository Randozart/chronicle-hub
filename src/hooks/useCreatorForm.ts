// src/hooks/useCreatorForm.ts
import { useState, useEffect, useCallback, useRef } from 'react';
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
    customSave?: () => Promise<any>,
    onSaveSuccess?: (data: T) => void 
) {
    const [data, setData] = useState<T | null>(initialData);
    const [originalData, setOriginalData] = useState<T | null>(initialData);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const { showToast } = useToast();

    // REFS
    const dataRef = useRef<T | null>(initialData);
    const isDirtyRef = useRef(isDirty);
    const customSaveRef = useRef(customSave);
    const onSaveSuccessRef = useRef(onSaveSuccess);

    useEffect(() => { if (data) dataRef.current = data; }, [data]);
    useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);
    useEffect(() => { customSaveRef.current = customSave; }, [customSave]);
    useEffect(() => { onSaveSuccessRef.current = onSaveSuccess; }, [onSaveSuccess]);

    useEffect(() => {
        if (initialData) {
            const deepCopy = JSON.parse(JSON.stringify(initialData));
            setData(deepCopy);
            setOriginalData(deepCopy);
            dataRef.current = deepCopy;
            setIsDirty(false);
            isDirtyRef.current = false;
        }
    }, [initialData]);

    const handleChange = useCallback((field: keyof T, value: any) => {
        setData(prev => {
            if (!prev) return null;
            const next = { ...prev, [field]: value };
            
            dataRef.current = next;

            const nowDirty = JSON.stringify(next) !== JSON.stringify(originalData);
            setIsDirty(nowDirty);
            isDirtyRef.current = nowDirty;
            return next;
        });
    }, [originalData]);

    const handleSave = useCallback(async () => {
        const currentData = dataRef.current;
        if (!currentData) return false;
        
        setIsSaving(true);
        try {
            const res = await fetch(saveEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...extraBodyParams, data: currentData })
            });

            if (res.status === 409) {
                showToast("Conflict: Data changed on server. Please reload.", "error");
                setIsSaving(false);
                return false;
            }

            if (!res.ok) throw new Error("Save failed");

            const responseData = await res.json();
            const savedData = { 
                ...currentData, 
                version: responseData.newVersion || (currentData.version || 0) + 1 
            };

            setOriginalData(JSON.parse(JSON.stringify(savedData)));
            setData(savedData);
            setIsDirty(false);
            isDirtyRef.current = false;
            setLastSaved(new Date());
            
            dataRef.current = savedData;

            showToast("Saved successfully", "success");

            if (onSaveSuccessRef.current) {
                onSaveSuccessRef.current(savedData);
            }

            return true;
        } catch (e) {
            console.error(e);
            showToast("Error saving changes", "error");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [extraBodyParams, saveEndpoint, showToast]);

    const revertChanges = useCallback(() => {
        if (originalData) {
            const copy = JSON.parse(JSON.stringify(originalData));
            setData(copy);
            dataRef.current = copy;
            setIsDirty(false);
            isDirtyRef.current = false;
            showToast("Changes discarded.", "info");
        }
    }, [originalData, showToast]);

    const resetState = useCallback(() => {
        if (data) {
            const copy = JSON.parse(JSON.stringify(data));
            setOriginalData(copy);
            setIsDirty(false);
            isDirtyRef.current = false;
            setLastSaved(new Date());
        }
    }, [data]);

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
        const onGlobalSave = () => {
            if (isDirtyRef.current) {
                if (customSaveRef.current) {
                    customSaveRef.current();
                } else {
                    handleSave();
                }
            }
        };
        window.addEventListener('global-save-trigger', onGlobalSave);
        return () => window.removeEventListener('global-save-trigger', onGlobalSave);
    }, [handleSave]);

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