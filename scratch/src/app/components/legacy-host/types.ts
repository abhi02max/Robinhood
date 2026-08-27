export type LegacyParams = Record<string, string>;

export type LegacyPageKey =
  | 'landing'
  | 'auth'
  | 'onboarding'
  | 'dashboard'
  | 'sheets'
  | 'sql-track'
  | 'problems'
  | 'problem-detail'
  | 'companies'
  | 'company-detail'
  | 'roadmap'
  | 'concept-map'
  | 'revision'
  | 'profile'
  | 'learn-hub'
  | 'learn-subject'
  | 'learn-topic'
  | 'learn-subtopic'
  | 'learn-lesson'
  | 'interview-hub'
  | 'interview-questions'
  | 'interview-practice'
  | 'interview-mock-session'
  | 'debugger-hub'
  | 'scheduler-dashboard'
  | 'analytics-dashboard'
  | 'revision-topic';

export type Runtime = {
  store: any;
  legacyRouter: any;
  renderSidebar: () => string;
  initTimer: () => void;
  showToast: (message: string, type?: string, duration?: number) => void;
  initCommandPalette: () => void;
  learningStore: any;
};

export type LegacyPageModule = {
  renderPage: (params?: LegacyParams) => string;
  initPage?: (params?: LegacyParams) => void;
};

export type PageRuntime = {
  landing: LegacyPageModule;
  auth: LegacyPageModule;
  onboarding: LegacyPageModule;
  dashboard: LegacyPageModule;
  sheets: LegacyPageModule;
  sqlTrack: LegacyPageModule;
  problems: LegacyPageModule;
  problemDetail: LegacyPageModule;
  companies: LegacyPageModule;
  companyDetail: LegacyPageModule;
  roadmap: LegacyPageModule;
  conceptMap: LegacyPageModule;
  revision: LegacyPageModule;
  revisionTopic?: LegacyPageModule;
  profile: LegacyPageModule;
  learnHub: LegacyPageModule;
  learnSubject: LegacyPageModule;
  learnTopic: LegacyPageModule;
  learnSubtopic: LegacyPageModule;
  learnLesson: LegacyPageModule;
  interviewHub: LegacyPageModule;
  interviewQuestions: LegacyPageModule;
  interviewPractice: LegacyPageModule;
  interviewMockSession: LegacyPageModule;
  debuggerHub: LegacyPageModule;
  schedulerDashboard: LegacyPageModule;
  analyticsDashboard: LegacyPageModule;
};

declare global {
  interface Window {
    __rhCoreBootstrapped?: boolean;
    navigateTo?: (path: string) => void;
    showToast?: (message: string, type?: string, duration?: number) => void;
    lucide?: { createIcons: (options?: { nodes?: Element[] }) => void };
  }
}

