'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type CreatorRole = 'owner' | 'writer' | 'reader';

interface CreatorContextType {
    role: CreatorRole;
    isReadOnly: boolean;
    storyId: string;
}

const CreatorContext = createContext<CreatorContextType>({ 
    role: 'reader', 
    isReadOnly: true,
    storyId: ''
});

export const useCreator = () => useContext(CreatorContext);

export function CreatorProvider({ 
    children, 
    storyId, 
    initialRole 
}: { 
    children: React.ReactNode, 
    storyId: string, 
    initialRole: CreatorRole 
}) {
    // Writers and Owners can edit. Readers cannot.
    const isReadOnly = initialRole === 'reader';

    return (
        <CreatorContext.Provider value={{ role: initialRole, isReadOnly, storyId }}>
            {children}
        </CreatorContext.Provider>
    );
}