import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecommendationState {
  step: number;
  formData: any;
  resultId: string | null;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateForm: (data: Partial<any>) => void;
  setResultId: (id: string) => void;
  resetRecommendation: () => void;
}

export const useRecommendationStore = create<RecommendationState>()(
  persist(
    (set, get) => ({
      step: 1,
      formData: {
        interests: [],
        currentSkills: [],
        desiredSkills: [],
      },
      resultId: null,

      setStep: (step) => set({ step }),
      nextStep: () => set((state) => ({ step: state.step + 1 })),
      prevStep: () => set((state) => ({ step: Math.max(1, state.step - 1) })),
      updateForm: (data) =>
        set((state) => ({ formData: { ...state.formData, ...data } })),
      setResultId: (id) => set({ resultId: id }),
      resetRecommendation: () =>
        set({
          step: 1,
          formData: { interests: [], currentSkills: [], desiredSkills: [] },
          resultId: null,
        }),
    }),
    {
      name: 'ai-recommendation-storage',
    },
  ),
);
