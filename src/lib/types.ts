export type Grade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface IndexGame {
  id: string; cluster_id: string; genre: string; sub_genre: string; tier: string; combo: string; size: string;
  zero: boolean; mkt_missing: boolean; pred: number; risk_prob: number | null; risk_grade: Grade | null;
  risk_rank: number | null; n_fix?: number | null; opportunity: string; recover_ops: number; priority: number;
  first_action?: string | null;
}

export interface Action {
  key: string; label: string; lever: string; from_value: number; to_value: number; mult: number;
  gain: number; gain_lo: number; gain_hi: number; extra_cost: number; net: number; feas: number; days: number;
  exp_net: number; per_day: number; score: number; edge: boolean; roi: number | null; evidence: string; ref_only: boolean;
}

export interface Compare {
  key: string; name: string; unit: string; value: number | null; peer_median: number; good_pct: number | null;
  status: string | null; contrib_pct: number; adjustable: string;
}

export interface Factor { key: string; name: string; contrib_pct: number; value: number; peer_median: number; unit: string }

export type Lever = 'crash' | 'update' | 'marketing' | 'engage' | 'apk';

export interface Game extends IndexGame {
  model: string; region: string; cluster_n: number; pred_lo80?: number; pred_hi80?: number; risk_level?: string;
  peer_median?: number; peer_pct?: number; peer_n?: number; gap_pct?: number; quadrant?: string | null;
  signals?: { crash: boolean; update: boolean; apk: boolean }; status?: string; recover_ops_pct: number;
  metrics: { crash: number | null; update: number; session: number; daily: number; engage: number; marketing: number | null; wishlist: number; apk: number; cpi: number | null };
  compare: Compare[]; factors: Factor[]; strengths?: Factor[]; actions: Action[];
  w?: Record<Lever, number[] | null>;
}

export interface ClusterHistory {
  n_train?: number; bench?: string; p25?: number; p50?: number; p75?: number; channel_share?: Record<string, number>;
  crash_ok_median?: number; crash_bad_median?: number | null; update_ok_median?: number; update_bad_median?: number | null;
  roas_median?: number | null; loss_rate?: number | null; note?: string;
}

export interface Cluster {
  id: string; key: string; label: string; combo: string; tier: string; size: string; n_test: number;
  grades: Partial<Record<Grade, number>>; pred_total: number; recover_total: number; n_high_risk: number; history: ClusterHistory;
}

export interface Template { title: string; target: string; hypothesis: string; action: string; metric: string; period: string; design: string }

export interface Evidence {
  summary: {
    n_test: number; n_live: number; n_zero: number; pred_total: number; recover_total: number; recover_pct: number; top10_share: number;
    grades: Record<Grade, { n: number; pred: number; recover: number }>;
  };
  model: { name: string; cv_rmsle: number; fresh_split_rmsle: number; public_rmsle: number; public_note: string };
  risk: {
    definition: string; formula: string; sigma_note: string; grades: { grade: Grade; range: string; level: string }[];
    validation: { grade: Grade; n: number; mean_prob: number; actual_below: number; actual_bottom25: number; actual_median: number }[]; validation_note: string;
  };
  priority: { formula: string; note: string };
  no_effect: { name: string; detail: string }[];
  insights: { id: number; title: string; fact: string; use: string }[];
  limitations: string[];
}

export interface PortfolioItem { id: string; role: string; why: string }

export interface Meta {
  evidence: Evidence; templates: Record<string, Template>; portfolio: PortfolioItem[]; clusters: Cluster[];
  grid: Record<Lever, number[]>; actions: Record<string, string>;
}

export interface ExperimentCard {
  id: string; game: string; actionKey: string; title: string; target: string; hypothesis: string; action: string; metric: string;
  period: string; design: string; owner: string; status: '초안' | '진행' | '완료'; createdAt: string;
  pred: number; grade: string; gain: number | null; gainLo: number | null; gainHi: number | null;
}
