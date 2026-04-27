export type QuestionTrigger = {
  phrase: string;
  category: 'comparison' | 'recommendation' | 'pricing' | 'alternatives' | 'feature' | 'other';
  score: number;
  evidence: string;
};

export type ThemeCluster = {
  id: string;
  label: string;
  keywords: string[];
  itemCount: number;
};
