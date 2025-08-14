import React from "react";
import { Skeleton } from "./skeleton";
import { Card } from "./card";

export const ContactFormSkeleton = () => (
  <div className="space-y-6">
    <div className="text-center space-y-2">
      <Skeleton className="h-8 w-48 mx-auto" />
      <Skeleton className="h-4 w-64 mx-auto" />
    </div>
    
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i} className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    ))}
  </div>
);

export const ContactListSkeleton = () => (
  <div className="space-y-6">
    <div className="text-center space-y-2">
      <Skeleton className="h-8 w-48 mx-auto" />
      <Skeleton className="h-4 w-32 mx-auto" />
    </div>
    
    <Skeleton className="h-10 w-full" />
    
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </Card>
      ))}
    </div>
  </div>
);

export const NetworkFlowSkeleton = () => (
  <div className="space-y-6">
    <div className="text-center space-y-2">
      <Skeleton className="h-8 w-48 mx-auto" />
      <Skeleton className="h-4 w-64 mx-auto" />
    </div>
    
    <div className="h-[600px] w-full bg-muted/20 rounded-lg flex items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="loading-spinner mx-auto"></div>
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  </div>
);