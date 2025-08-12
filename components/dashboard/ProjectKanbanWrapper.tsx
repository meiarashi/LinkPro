"use client";

import dynamic from 'next/dynamic';
import { ProjectWithStatus } from '../../types/project-status';

// @hello-pangea/dndをSSRを無効にして動的インポート
const ProjectKanban = dynamic(
  () => import('./ProjectKanbanDnd').then(mod => mod.ProjectKanban),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex-1 min-w-[240px] max-w-[320px]">
                <div className="h-10 bg-gray-200 rounded-t-lg mb-2"></div>
                <div className="h-96 bg-gray-100 rounded-b-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
);

interface ProjectKanbanWrapperProps {
  projects: ProjectWithStatus[];
  onProjectUpdate?: () => void;
}

export function ProjectKanbanWrapper({ projects, onProjectUpdate }: ProjectKanbanWrapperProps) {
  return <ProjectKanban projects={projects} onProjectUpdate={onProjectUpdate} />;
}