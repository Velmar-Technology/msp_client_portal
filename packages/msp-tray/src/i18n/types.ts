export type SupportedLocale = 'en_US' | 'es_DO';

export interface TranslationDictionary {
  common: {
    appName: string;
    loading: string;
    cancel: string;
    save: string;
    close: string;
    resolve: string;
    you: string;
    status: {
      open: string;
      inProgress: string;
      resolved: string;
      closed: string;
      cancelled: string;
    };
    priority: {
      low: string;
      medium: string;
      high: string;
      critical: string;
    };
    category: {
      helpdesk: string;
      repair: string;
      serviceOutage: string;
      preventativeMaintenance: string;
      warranty: string;
      ai: string;
    };
  };
  header: {
    online: string;
    connecting: string;
    endpointWorkstation: string;
    managedSystem: string;
    unlinkedEndpoint: string;
    refreshVitalsTooltip: string;
    setShiftWorkerTooltip: string;
    loggedInAs: string;
    identify: string;
    hideToTray: string;
    langToggle: string;
    openLogsTooltip: string;
  };
  service: {
    offlineTitle: string;
    offlineDesc: string;
    restartBtn: string;
    restarting: string;
    restartSuccess: string;
    restartFailed: string;
  };
  gate: {
    title: string;
    subtitle: string;
    pinHeader: string;
    expiresIn: string;
    expired: string;
    copyPin: string;
    copied: string;
    newPin: string;
    newPinTooltip: string;
    howToLinkTitle: string;
    howToLinkText: string;
    realTimeDetection: string;
    waitingForBind: string;
  };
  navigation: {
    quickSupport: string;
    tickets: string;
  };
  support: {
    activeTicketBannerLiveChat: string;
    heroTitle: string;
    heroSubtitle: string;
    reportIssueBtn: string;
    commonIssues: string;
    shortcutPrinter: string;
    shortcutVpn: string;
    shortcutErp: string;
    shortcutEmail: string;
    shortcutPrinterTitle: string;
    shortcutVpnTitle: string;
    shortcutErpTitle: string;
    shortcutEmailTitle: string;
    shortcutSlow: string;
    shortcutSlowTitle: string;
  };
  tickets: {
    allTab: string;
    activeTab: string;
    resolvedTab: string;
    searchPlaceholder: string;
    loadingHistory: string;
    noTicketsFound: string;
    noTicketsMatchSearch: string;
    noTicketsRecorded: string;
    reportIssueNow: string;
  };
  quickTicket: {
    modalTitle: string;
    modalSubtitle: string;
    titleLabel: string;
    titlePlaceholder: string;
    categoryLabel: string;
    priorityLabel: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    flightRecorderTitle: string;
    flightRecorderSubtitle: string;
    sendBtn: string;
    transmittingBtn: string;
    errorTitleRequired: string;
    errorDescRequired: string;
    errorGeneric: string;
  };
  chat: {
    markResolved: string;
    markResolvedTooltip: string;
    replyPlaceholder: string;
    sendTooltip: string;
  };
  attribution: {
    modalTitle: string;
    modalSubtitle: string;
    modalDescription: string;
    fullNameLabel: string;
    fullNamePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    saveIdentity: string;
    errorNameRequired: string;
    errorEmailInvalid: string;
  };
  trayMenu: {
    tooltip: string;
    openDrawer: string;
    exitApp: string;
  };
}
