import { Injectable, Logger } from '@nestjs/common';

export interface AssessmentSummaryInput {
  stage: string;
  topTraits: string[];
  growthAreas: string[];
}

@Injectable()
export class AssessmentAiService {
  private readonly logger = new Logger(AssessmentAiService.name);

  async generateSummary(input: AssessmentSummaryInput): Promise<string> {
    const fallback = `จากผลประเมินในวัย ${input.stage} คุณเป็นคนที่มีความโดดเด่นด้าน ${input.topTraits.join(', ')} คุณอาจเหมาะกับสายงานที่ได้ใช้จุดแข็งเหล่านี้ และหากพัฒนาด้าน ${input.growthAreas.join(', ')} เพิ่มเติม จะช่วยให้คุณเติบโตได้อย่างไร้ขีดจำกัด`;

    try {
      // Integrate Gemini / Ollama here if ENV exists
      if (process.env.GEMINI_API_KEY) {
        // Mocking API call for structure
        // const res = await fetch('...');
        // return res.text;
      }
      return fallback;
    } catch (error) {
      this.logger.error('AI Generation failed, using fallback', error);
      return fallback; // ห้าม Throw error ตามกฎ
    }
  }
}
