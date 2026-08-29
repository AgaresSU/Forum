export type ForumRole = 'guest' | 'member' | 'pro' | 'moderator' | 'admin';

export type ForumSession = {
  userId: string;
  role: ForumRole;
  displayName: string;
};

export interface IdentityGateway {
  getSession(): Promise<ForumSession | null>;
  signOut(): Promise<void>;
}

export interface BillingGateway {
  getEntitlements(userId: string): Promise<string[]>;
  createSubscriptionCheckout(userId: string, planId: string): Promise<{ redirectUrl: string }>;
}

export interface NotificationGateway {
  sendForumNotification(input: {
    userId: string;
    topicId: string;
    kind: 'reply' | 'mention' | 'moderation';
  }): Promise<void>;
}

export interface ReferralGateway {
  recordReferral(input: {
    ownerId: string;
    programId: string;
    source: string;
  }): Promise<void>;
}

export interface ModerationGateway {
  enqueue(input: {
    entityId: string;
    entityType: 'topic' | 'reply';
    reason: string;
  }): Promise<void>;
}

export type IntegrationContainer = {
  identity: IdentityGateway;
  billing: BillingGateway;
  notifications: NotificationGateway;
  referrals: ReferralGateway;
  moderation: ModerationGateway;
};
