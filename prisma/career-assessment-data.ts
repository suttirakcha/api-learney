import { AssessmentQuestionType } from '../src/database/generated/prisma/client';

export const LIKERT_5_OPTIONS = [
  { text: 'ไม่ตรงเลย', weight: 1 },
  { text: 'ค่อนข้างไม่ตรง', weight: 2 },
  { text: 'ปานกลาง', weight: 3 },
  { text: 'ค่อนข้างตรง', weight: 4 },
  { text: 'ตรงมาก', weight: 5 },
];

export const LIKERT_5_REVERSE = [
  { text: 'ไม่ตรงเลย', weight: 5 },
  { text: 'ค่อนข้างไม่ตรง', weight: 4 },
  { text: 'ปานกลาง', weight: 3 },
  { text: 'ค่อนข้างตรง', weight: 2 },
  { text: 'ตรงมาก', weight: 1 },
];

// Helper Function สำหรับสร้างข้อสอบ Likert ได้ไวขึ้น
const createLikert = (
  prompt: string,
  category: string,
  helperText: string = '',
  isReverse: boolean = false,
) => ({
  prompt,
  type: AssessmentQuestionType.RATING_SCALE,
  category,
  helperText,
  options: isReverse ? LIKERT_5_REVERSE : LIKERT_5_OPTIONS,
});

// ==========================================
// 1. Primary School (7-12 ปี)
// เน้น: curiosity, self_regulation, empathy, playful_exploration, confidence
// ==========================================
export const primaryQuestions = [
  createLikert(
    'ฉันชอบตั้งคำถามว่า "ทำไม" กับสิ่งต่างๆ รอบตัวเสมอ',
    'curiosity',
    'เช่น ทำไมท้องฟ้าถึงสีฟ้า ทำไมนกถึงบินได้',
  ),
  createLikert(
    'เวลาได้ของเล่นใหม่ ฉันชอบแกะดูว่าข้างในมันทำงานยังไง',
    'curiosity',
    'อยากรู้กลไกการทำงานของสิ่งของ',
  ),
  createLikert(
    'ฉันชอบอ่านหนังสือ หรือดูสารคดีเรื่องสัตว์ อวกาศ หรือวิทยาศาสตร์',
    'curiosity',
  ),
  createLikert('ฉันสนุกกับการค้นหาคำตอบในเรื่องที่ฉันยังไม่รู้', 'curiosity'),
  createLikert(
    'เวลาไปเที่ยวที่ใหม่ๆ ฉันจะตื่นเต้นและอยากเดินสำรวจไปทั่ว',
    'curiosity',
  ),

  createLikert(
    'เวลาฉันรู้สึกโกรธ ฉันสามารถสงบสติอารมณ์ได้โดยไม่ทำลายข้าวของ',
    'self_regulation',
    'การควบคุมอารมณ์ตัวเองเมื่อเจอเรื่องไม่ดั่งใจ',
  ),
  createLikert(
    'ฉันมักจะทำการบ้านให้เสร็จก่อน แล้วค่อยไปเล่นเกมหรือดูการ์ตูน',
    'self_regulation',
    'ความรับผิดชอบและจัดลำดับความสำคัญ',
  ),
  createLikert(
    'แม้จะเป็นวิชาที่ไม่ชอบ ฉันก็ตั้งใจเรียนจนจบชั่วโมง',
    'self_regulation',
  ),
  createLikert(
    'เวลาเล่นเกมแพ้ ฉันสามารถยอมรับความพ่ายแพ้ได้โดยไม่งอแง',
    'self_regulation',
  ),

  createLikert(
    'ฉันชอบแบ่งปันขนมหรือของเล่นให้เพื่อนๆ เสมอ',
    'empathy',
    'การมีน้ำใจและการอยู่ร่วมกับผู้อื่น',
  ),
  createLikert(
    'เวลาเห็นเพื่อนร้องไห้หรือเสียใจ ฉันจะเข้าไปถามและปลอบใจเพื่อน',
    'empathy',
  ),
  createLikert(
    'ฉันชอบทำงานกลุ่ม เพราะได้ช่วยกันคิดและช่วยกันทำกับเพื่อน',
    'empathy',
  ),
  createLikert(
    'ฉันยินดีช่วยเหลือคุณครูหรือพ่อแม่ทำงานบ้านโดยไม่ต้องรอให้สั่ง',
    'empathy',
  ),
  createLikert(
    'เวลาเพื่อนทำผิดพลาด ฉันเลือกที่จะให้กำลังใจมากกว่าหัวเราะเยาะ',
    'empathy',
  ),

  createLikert(
    'ฉันชอบลองเล่นกีฬา กิจกรรม หรือศิลปะแบบใหม่ๆ ที่ไม่เคยทำมาก่อน',
    'playful_exploration',
    'ความกล้าเปิดรับประสบการณ์ใหม่ๆ ผ่านการเล่น',
  ),
  createLikert(
    'ฉันชอบวาดรูป ประดิษฐ์ของเล่น หรือสร้างเรื่องราวจากจินตนาการของฉันเอง',
    'playful_exploration',
  ),
  createLikert(
    'เวลาต่อเลโก้หรือตัวต่อ ฉันชอบต่อแบบอิสระมากกว่าต่อตามคู่มือ',
    'playful_exploration',
  ),
  createLikert(
    'ฉันสนุกกับการสมมติบทบาทเป็นอาชีพต่างๆ เช่น เป็นหมอ เป็นนักบิน',
    'playful_exploration',
  ),

  createLikert(
    'ฉันกล้ายกมือตอบคำถามคุณครูในห้องเรียน แม้จะไม่แน่ใจว่าถูกไหม',
    'confidence',
    'ความมั่นใจในตัวเอง',
  ),
  createLikert('ฉันไม่กลัวที่จะลุกขึ้นนำเสนอผลงานหน้าชั้นเรียน', 'confidence'),
  createLikert(
    'เมื่อได้รับมอบหมายงานใหม่ ฉันเชื่อว่า "ฉันทำได้!"',
    'confidence',
  ),
  createLikert(
    'ฉันกล้าที่จะบอกผู้ใหญ่เมื่อฉันรู้สึกว่าสิ่งนั้นไม่ถูกต้อง',
    'confidence',
  ),

  // Multiple Choice Questions สำหรับวัยประถม
  {
    prompt: 'เวลาว่างในวันหยุด น้องๆ ชอบทำกิจกรรมแนวไหนมากที่สุด?',
    type: AssessmentQuestionType.SINGLE_CHOICE,
    category: 'playful_exploration',
    helperText: 'เลือกคำตอบที่ตรงกับสิ่งที่ชอบทำมากที่สุด 1 ข้อ',
    options: [
      { text: 'ประดิษฐ์ของเล่น สร้างป้อมปราการ เลโก้', weight: 5 },
      { text: 'อ่านหนังสือ ดูสารคดี ทดลองวิทยาศาสตร์', weight: 5 },
      { text: 'วาดรูป ระบายสี ร้องเพลง เต้นรำ', weight: 5 },
      { text: 'เล่นกีฬา วิ่งเล่น ออกกำลังกายกับเพื่อน', weight: 5 },
    ],
  },
  {
    prompt: 'ถ้าต้องทำโครงงานกลุ่ม น้องๆ ชอบรับหน้าที่ไหน?',
    type: AssessmentQuestionType.SINGLE_CHOICE,
    category: 'teamwork',
    helperText: 'ไม่มีคำตอบที่ผิด เลือกสิ่งที่หนูถนัดได้เลย',
    options: [
      { text: 'เป็นหัวหน้ากลุ่ม คอยแบ่งงานให้เพื่อน', weight: 5 },
      { text: 'เป็นคนหาข้อมูลและค้นคว้าเรื่องต่างๆ', weight: 5 },
      { text: 'เป็นคนตกแต่งป้ายนิเทศหรือทำสไลด์ให้สวยงาม', weight: 5 },
      { text: 'เป็นคนนำเสนอและพูดอธิบายหน้าห้อง', weight: 5 },
    ],
  },
];

// ==========================================
// 2. Secondary School (13-18 ปี)
// เน้น: career_interests, self_efficacy, growth_mindset, career_exploration, decision_readiness, adaptability
// ==========================================
export const secondaryQuestions = [
  createLikert(
    'ฉันเริ่มค้นหาข้อมูลเกี่ยวกับคณะ มหาวิทยาลัย หรือสายอาชีพที่อยากทำแล้ว',
    'career_exploration',
    'การเริ่มตระหนักถึงอนาคตตัวเอง',
  ),
  createLikert(
    'ฉันชอบเข้าร่วมกิจกรรม ค่าย (Camp) หรือ Open House เพื่อค้นหาความชอบของตัวเอง',
    'career_exploration',
  ),
  createLikert(
    'ฉันมักจะพูดคุยเรื่องอาชีพในอนาคตกับเพื่อน รุ่นพี่ หรือคุณครูแนะแนว',
    'career_exploration',
  ),
  createLikert(
    'ฉันชอบลองลงมือทำโปรเจกต์ หรือกิจกรรมนอกห้องเรียนเพื่อดูว่าตัวเองถนัดอะไร',
    'career_exploration',
  ),

  createLikert(
    'ฉันมีกลุ่มอาชีพหรือคณะในฝันที่อยากเข้าเรียนอย่างชัดเจนแล้ว',
    'career_interests',
  ),
  createLikert(
    'ฉันรู้ว่าตัวเองถนัดวิชาอะไร และชอบกิจกรรมประเภทไหนเป็นพิเศษ',
    'career_interests',
  ),
  createLikert(
    'ฉันมีบุคคลต้นแบบ (Idol) ในสายอาชีพที่ฉันอยากเป็น',
    'career_interests',
  ),

  createLikert(
    'ฉันสามารถประเมินผลดีและผลเสียก่อนตัดสินใจเรื่องสำคัญได้ด้วยตัวเอง',
    'decision_readiness',
    'ความพร้อมในการตัดสินใจ',
  ),
  createLikert(
    'ฉันเป็นคนตัดสินใจเลือกแผนการเรียน (สายวิทย์/ศิลป์) หรือกิจกรรมชุมนุมด้วยตัวเอง',
    'decision_readiness',
  ),
  createLikert(
    'เมื่อต้องตัดสินใจเลือกเรียนต่อ ฉันไม่ปล่อยให้เป็นหน้าที่ของพ่อแม่เพียงฝ่ายเดียว',
    'decision_readiness',
  ),

  createLikert(
    'เมื่อตั้งเป้าหมายอะไรไว้ ฉันเชื่อมั่นว่าฉันจะหาวิธีทำให้สำเร็จได้',
    'self_efficacy',
    'ความเชื่อมั่นในความสามารถของตนเอง',
  ),
  createLikert(
    'เมื่อเจอปัญหาเฉพาะหน้าที่ไม่คาดคิด ฉันสามารถตั้งสติและหาวิธีแก้ไขได้ดี',
    'self_efficacy',
  ),
  createLikert(
    'ฉันสามารถจัดการเวลาเรียนและกิจกรรมของตัวเองได้โดยไม่ต้องมีใครมาคอยเตือน',
    'self_efficacy',
  ),
  createLikert(
    'แม้จะไม่เคยทำมาก่อน แต่ถ้าพยายาม ฉันก็เชื่อว่าฉันทำได้',
    'self_efficacy',
  ),

  createLikert(
    'เมื่อทำข้อสอบได้คะแนนน้อย ฉันมองว่าเป็นโอกาสให้รู้จุดอ่อนและแก้ไขในครั้งหน้า',
    'growth_mindset',
    'กรอบความคิดแบบเติบโต',
  ),
  createLikert(
    'ฉันไม่กลัวที่จะรับคำวิจารณ์ (Feedback) เพราะมันทำให้ฉันเก่งขึ้น',
    'growth_mindset',
  ),
  createLikert(
    'เมื่อเห็นเพื่อนเก่งกว่า ฉันรู้สึกอยากเรียนรู้จากเขา มากกว่ารู้สึกอิจฉา',
    'growth_mindset',
  ),
  createLikert(
    'ฉันรู้สึกท้อแท้และอยากเลิกทำทันทีเมื่อเจอเรื่องที่ยากเกินไป',
    'growth_mindset',
    'ข้อนี้เป็นคำถามเชิงลบ (Reverse Score)',
    true,
  ),

  createLikert(
    'เมื่อย้ายห้องเรียน ย้ายโรงเรียน หรือเจอเพื่อนใหม่ ฉันสามารถปรับตัวเข้าหาคนอื่นได้เร็ว',
    'adaptability',
    'ความยืดหยุ่นในการปรับตัว',
  ),
  createLikert(
    'เมื่อแผนการที่วางไว้ต้องเปลี่ยนกะทันหัน ฉันสามารถหาวิธีสำรอง (Plan B) ได้ทันที',
    'adaptability',
  ),
  createLikert(
    'ฉันเปิดรับความคิดเห็นของเพื่อนที่คิดต่างจากฉันเสมอ',
    'adaptability',
  ),
  createLikert(
    'ฉันชอบใช้เทคโนโลยีและแอปพลิเคชันใหม่ๆ ในการช่วยทำการบ้านหรือพรีเซนต์งาน',
    'adaptability',
  ),

  // Multiple Choice Questions
  {
    prompt: 'เวลาเจองานที่ยากและท้าทาย สิ่งแรกที่คุณมักจะทำคืออะไร?',
    type: AssessmentQuestionType.SINGLE_CHOICE,
    category: 'growth_mindset',
    helperText: 'ไม่มีข้อถูกผิด เลือกตามพฤติกรรมจริงของคุณ',
    options: [
      {
        text: 'ค้นหาข้อมูลในเน็ต หรือถาม ChatGPT ทันทีเพื่อหาวิธีทำ',
        weight: 5,
      },
      { text: 'ขอคำปรึกษาจากเพื่อนหรือครูที่เก่งเรื่องนี้', weight: 4 },
      { text: 'ลองงมทำด้วยตัวเองไปก่อน ผิดถูกค่อยว่ากัน', weight: 5 },
      { text: 'รู้สึกเครียดและหาคนมาช่วยทำแทน', weight: 2 },
    ],
  },
  {
    prompt: 'รูปแบบการเรียนรู้ที่คุณชอบและจำได้ดีที่สุดคือแบบไหน?',
    type: AssessmentQuestionType.SINGLE_CHOICE,
    category: 'career_interests',
    helperText: 'เพื่อประเมินสไตล์การเรียนรู้ (Learning Style)',
    options: [
      { text: 'Visual: ชอบดูแผนภาพ วิดีโอ สไลด์สวยๆ', weight: 5 },
      {
        text: 'Auditory: ชอบฟังพอดแคสต์ เลกเชอร์ หรือคุยถกเถียงกัน',
        weight: 5,
      },
      {
        text: 'Kinesthetic: ชอบลงมือทำจริง หยิบจับ ทดลองด้วยตัวเอง',
        weight: 5,
      },
      {
        text: 'Reading/Writing: ชอบอ่านหนังสือและจดสรุปโน้ตด้วยตัวเอง',
        weight: 5,
      },
    ],
  },
];

// ==========================================
// 3. University (19-22 ปี)
// เน้น: career_adaptability, communication, teamwork, critical_thinking, digital_readiness, work_values
// ==========================================
export const universityQuestions = [
  createLikert(
    'ฉันพร้อมและเปิดรับที่จะเปลี่ยนเป้าหมายสายอาชีพ หากตลาดงานหรือเทคโนโลยีเปลี่ยนไป',
    'career_adaptability',
    'ความยืดหยุ่นทางอาชีพ',
  ),
  createLikert(
    'ฉันคอยอัปเดตเทรนด์ใหม่ๆ ในสายอุตสาหกรรมที่ฉันเรียนอยู่เสมอ',
    'career_adaptability',
  ),
  createLikert(
    'ฉันได้เตรียมแผนสำรอง (Plan B) ไว้แล้ว หากไม่ได้ทำงานตรงสายที่เรียนมา',
    'career_adaptability',
  ),
  createLikert(
    'ฉันสนใจเข้าร่วมโครงการฝึกงาน (Internship) เพื่อเตรียมความพร้อมก่อนทำงานจริง',
    'career_adaptability',
  ),

  createLikert(
    'ฉันสามารถเรียบเรียงความคิดและนำเสนองานหน้าชั้นเรียนได้อย่างเป็นระบบและน่าสนใจ',
    'communication',
    'ทักษะการสื่อสาร',
  ),
  createLikert(
    'ฉันสามารถเขียนอีเมลหรือรายงานเชิงวิชาการ/เชิงธุรกิจได้อย่างมืออาชีพ',
    'communication',
  ),
  createLikert(
    'เมื่อเกิดความขัดแย้งในกลุ่ม ฉันสามารถเจรจาไกล่เกลี่ยให้สถานการณ์ดีขึ้นได้',
    'communication',
  ),

  createLikert(
    'ฉันรับฟังและให้เกียรติความคิดเห็นของเพื่อนร่วมกลุ่ม แม้ฉันจะไม่เห็นด้วยก็ตาม',
    'teamwork',
    'การทำงานเป็นทีม',
  ),
  createLikert(
    'เมื่อทำงานกลุ่ม ฉันรับผิดชอบงานในส่วนของตัวเองได้เสร็จตามเวลาเสมอ',
    'teamwork',
  ),
  createLikert(
    'ฉันพร้อมที่จะเป็นทั้ง "ผู้นำ" และ "ผู้ตาม" ที่ดีในสถานการณ์ที่แตกต่างกัน',
    'teamwork',
  ),
  createLikert(
    'ฉันชอบทำงานคนเดียวมากกว่าทำงานเป็นทีม เพราะรำคาญปัญหาคน',
    'teamwork',
    'คำถามเชิงลบ (Reverse Score)',
    true,
  ),

  createLikert(
    'เมื่อรับข้อมูลข่าวสาร ฉันมักจะวิเคราะห์ความน่าเชื่อถือของแหล่งที่มาก่อนเชื่อเสมอ',
    'critical_thinking',
    'การคิดเชิงวิพากษ์',
  ),
  createLikert(
    'ฉันสามารถมองเห็นปัญหาและเสนอทางออกที่สร้างสรรค์นอกเหนือจากทฤษฎีในตำราได้',
    'critical_thinking',
  ),
  createLikert(
    'เมื่อเจอปัญหาที่ซับซ้อน ฉันมักจะแตกปัญหาใหญ่ออกเป็นส่วนเล็กๆ เพื่อแก้ไขทีละจุด',
    'critical_thinking',
  ),
  createLikert(
    'ฉันชอบตั้งคำถามต่อยอดจากสิ่งที่อาจารย์สอน มากกว่าจดจำเพื่อไปสอบเพียงอย่างเดียว',
    'critical_thinking',
  ),

  createLikert(
    'ฉันสามารถใช้โปรแกรมพื้นฐานและ AI Tools (เช่น ChatGPT, Notion, Canva) เพื่อช่วยทุ่นแรงในการทำงานได้ดี',
    'digital_readiness',
    'ความพร้อมด้านดิจิทัล',
  ),
  createLikert(
    'ฉันสามารถเรียนรู้การใช้ซอฟต์แวร์ใหม่ๆ สำหรับสายอาชีพของฉันได้รวดเร็ว',
    'digital_readiness',
  ),
  createLikert(
    'ฉันเข้าใจและระมัดระวังเรื่องลิขสิทธิ์ ความเป็นส่วนตัว และจริยธรรมในการใช้ข้อมูลบนโลกออนไลน์',
    'digital_readiness',
  ),

  createLikert(
    'ฉันให้ความสำคัญกับบริษัทที่มีวัฒนธรรมองค์กรที่ดี มากกว่าตัวเงินเดือนเพียงอย่างเดียว',
    'work_values',
    'ค่านิยมในการทำงาน',
  ),
  createLikert(
    'ฉันมองหางานที่สร้าง Impact หรือทำประโยชน์บางอย่างให้กับสังคม',
    'work_values',
  ),
  createLikert(
    'โอกาสในการเติบโตและการได้พัฒนาทักษะ (Upskill) สำคัญกว่าตำแหน่งที่มั่นคงแต่ไม่ได้เรียนรู้อะไรใหม่',
    'work_values',
  ),

  // Multiple Choice Questions
  {
    prompt:
      'สิ่งที่สำคัญที่สุดสำหรับคุณในการเลือกสถานที่ทำงานหลังเรียนจบ คือข้อใด?',
    type: AssessmentQuestionType.SINGLE_CHOICE,
    category: 'work_values',
    helperText: 'เลือกข้อที่สำคัญที่สุดสำหรับคุณเพียงข้อเดียว',
    options: [
      { text: 'เงินเดือน โบนัส และสวัสดิการที่คุ้มค่า', weight: 5 },
      { text: 'ความก้าวหน้า โอกาสเลื่อนตำแหน่งไว และได้พัฒนาทักษะ', weight: 5 },
      {
        text: 'สมดุลชีวิต (Work-Life Balance) และความยืดหยุ่น (WFH)',
        weight: 5,
      },
      {
        text: 'สังคมเพื่อนร่วมงานที่ดี หัวหน้าเก่ง และมีอิสระในการคิด',
        weight: 5,
      },
    ],
  },
  {
    prompt:
      'คุณคิดว่าทักษะ (Skill) ส่วนใดที่คุณยังต้องเร่งพัฒนามากที่สุดก่อนเรียนจบ?',
    type: AssessmentQuestionType.SINGLE_CHOICE,
    category: 'career_adaptability',
    helperText: 'เพื่อวางแผนแนะนำคอร์สเรียนเพิ่มเติม',
    options: [
      {
        text: 'Hard Skills เชิงเทคนิค (เช่น โค้ดดิ้ง, การวิเคราะห์ข้อมูล, ดีไซน์)',
        weight: 5,
      },
      {
        text: 'Soft Skills การเข้าสังคม (เช่น การสื่อสาร, การนำเสนอ, ความเป็นผู้นำ)',
        weight: 5,
      },
      {
        text: 'Digital & AI Tools (เช่น การใช้ AI ช่วยทำงาน, ซอฟต์แวร์สมัยใหม่)',
        weight: 5,
      },
      { text: 'ภาษาต่างประเทศ (เช่น ภาษาอังกฤษสำหรับการทำงาน)', weight: 5 },
    ],
  },
];

// ==========================================
// 4. Working Age (23+ ปี)
// เน้น: reskilling_readiness, leadership, collaboration, ai_fluency, work_values, work_style, learning_agility
// ==========================================
export const workingAgeQuestions = [
  createLikert(
    'ฉันพร้อมเสมอที่จะ Reskill ตัวเองไปเรียนรู้สายงานใหม่ หากสายงานเดิมเริ่มชะลอตัว',
    'reskilling_readiness',
    'ความพร้อมในการเปลี่ยนสายงาน',
  ),
  createLikert(
    'ฉันแบ่งเวลาอย่างน้อยสัปดาห์ละ 1-2 ชั่วโมงเพื่อเรียนรู้ทักษะใหม่ๆ ที่อยู่นอกเหนือจากงานประจำ',
    'reskilling_readiness',
  ),
  createLikert(
    'ฉันไม่รู้สึกกลัวที่จะต้องกลับไปเป็น "มือใหม่" (Beginner) ในทักษะที่เพิ่งเริ่มเรียน',
    'reskilling_readiness',
  ),
  createLikert(
    'ฉันรู้ว่าตัวเองมีจุดอ่อนด้านไหน และกำลังหาคอร์สหรือวิธีพัฒนาจุดอ่อนนั้นอยู่',
    'reskilling_readiness',
  ),

  createLikert(
    'ฉันสามารถกระตุ้นและสร้างแรงบันดาลใจให้คนในทีมทำงานบรรลุเป้าหมายได้',
    'leadership',
    'ความเป็นผู้นำ',
  ),
  createLikert(
    'เมื่อเกิดปัญหาวิกฤตในงาน ฉันมักจะเป็นคนแรกๆ ที่กล้าก้าวออกมารับหน้าที่แก้ไข',
    'leadership',
  ),
  createCacheLikert(
    'ฉันยินดีให้คำแนะนำ (Mentoring) และแบ่งปันความรู้ให้กับน้องๆ หรือเพื่อนร่วมงานเสมอ',
    'leadership',
  ),

  createLikert(
    'ฉันสามารถทำงานร่วมกับคนต่างแผนก ต่างสายอาชีพ หรือต่างเจเนอเรชันได้อย่างราบรื่น',
    'collaboration',
    'การทำงานร่วมกันข้ามสายงาน',
  ),
  createLikert(
    'ฉันมักจะเป็นคนช่วยประสานงาน (Facilitator) ให้โปรเจกต์ที่ซับซ้อนดำเนินไปได้ด้วยดี',
    'collaboration',
  ),
  createLikert(
    'ฉันรับฟัง Constructive Feedback จากหัวหน้าและเพื่อนร่วมงานอย่างเปิดใจเพื่อพัฒนางาน',
    'collaboration',
  ),
  createLikert(
    'ฉันชอบเก็บงานไว้ทำเองคนเดียวทั้งหมด เพราะไม่ไว้ใจคุณภาพงานของคนอื่น',
    'collaboration',
    'คำถามเชิงลบ (Reverse Score)',
    true,
  ),

  createLikert(
    'ฉันใช้ AI Tools (เช่น ChatGPT, Claude, Midjourney) เป็นผู้ช่วยในการทำงานเป็นประจำ',
    'ai_fluency',
    'ความคล่องแคล่วด้าน AI และเทคโนโลยี',
  ),
  createLikert(
    'ฉันสามารถเขียน Prompt เพื่อสั่งงาน AI ให้ได้ผลลัพธ์ตามที่ต้องการได้อย่างแม่นยำ',
    'ai_fluency',
  ),
  createLikert(
    'ฉันมักจะเป็นคนริเริ่มนำเครื่องมือดิจิทัลหรือซอฟต์แวร์ใหม่ๆ มาแนะนำให้ทีมใช้เพื่อลดเวลาทำงาน',
    'ai_fluency',
  ),
  createLikert(
    'ฉันสามารถวิเคราะห์ข้อมูล (Data Analysis) เบื้องต้นเพื่อประกอบการตัดสินใจในงานได้',
    'ai_fluency',
  ),

  createLikert(
    'ฉันสามารถประยุกต์ใช้ความรู้จากประสบการณ์เดิม มาแก้ปัญหาในบริบทใหม่ได้อย่างรวดเร็ว',
    'learning_agility',
    'ความคล่องแคล่วในการเรียนรู้',
  ),
  createLikert(
    'เมื่อเจอโปรเจกต์ที่ไม่เคยทำ ฉันสามารถเรียนรู้ระบบงาน (Onboarding) และเริ่มงานได้ไวกว่าคนทั่วไป',
    'learning_agility',
  ),
  createLikert(
    'ข้อผิดพลาดจากการทำงาน คือบทเรียนชั้นดีที่ฉันนำมาทำคู่มือป้องกัน (Lesson Learned) ทันที',
    'learning_agility',
  ),

  createLikert(
    'ฉันประเมินความก้าวหน้าของตัวเองจากทักษะที่เพิ่มขึ้น มากกว่าตำแหน่งบนนามบัตร',
    'work_values',
    'ค่านิยมเป้าหมายการทำงาน',
  ),
  createLikert(
    'ความยืดหยุ่นในการทำงาน (เวลาเข้างาน/สถานที่) สำคัญกับฉันพอๆ กับฐานเงินเดือน',
    'work_values',
  ),
  createLikert(
    'ฉันกำลังมองหาความท้าทายใหม่ๆ หรือพิจารณาการย้ายสายอาชีพ (Career Transition) ในช่วง 1-2 ปีนี้',
    'work_values',
  ),

  // Multiple Choice Questions
  {
    prompt:
      'รูปแบบการทำงาน (Work Style) แบบไหนที่ทำให้คุณ Productive หรือรีดศักยภาพออกมาได้ดีที่สุด?',
    type: AssessmentQuestionType.SINGLE_CHOICE,
    category: 'work_style',
    helperText: 'เพื่อวิเคราะห์สไตล์สภาพแวดล้อมที่เหมาะสมกับคุณ',
    options: [
      {
        text: 'Remote / WFH 100%: มีสมาธิสูงสุดเมื่อได้ทำงานเงียบๆ คนเดียวที่บ้าน',
        weight: 5,
      },
      {
        text: 'Hybrid: เข้าออฟฟิศเพื่อประชุมทีม 2-3 วัน และวันที่เหลือเน้นโฟกัสงานเดี่ยว',
        weight: 5,
      },
      {
        text: 'Office 100%: ชอบการได้เจอหน้า พูดคุยเบรนสตรอมแบบ Real-time หน้างาน',
        weight: 5,
      },
      {
        text: 'Digital Nomad: ทำงานที่ไหนก็ได้บนโลก ขอแค่วัดผลที่เนื้องานอย่างชัดเจน',
        weight: 5,
      },
    ],
  },
  {
    prompt:
      'หากบริษัทมีงบส่งคุณไปเรียนคอร์ส Upskill คุณอยากจะเลือกเรียนสายไหนมากที่สุด?',
    type: AssessmentQuestionType.SINGLE_CHOICE,
    category: 'reskilling_readiness',
    helperText: 'เพื่อระบบจะได้แนะนำคอร์สในหมวดนั้นให้คุณอย่างแม่นยำ',
    options: [
      {
        text: 'AI & Data Science (เช่น การใช้ AI ทุ่นแรงงาน, การวิเคราะห์ Data)',
        weight: 5,
      },
      {
        text: 'Leadership & Management (เช่น จิตวิทยาการคุมทีม, Agile, การบริหารโปรเจกต์)',
        weight: 5,
      },
      {
        text: 'Digital Marketing & Content (เช่น การตลาดยุคใหม่, การเล่าเรื่อง)',
        weight: 5,
      },
      {
        text: 'Tech / Coding / Design (เช่น เขียนโปรแกรมเบื้องต้น, ออกแบบ UX/UI)',
        weight: 5,
      },
    ],
  },
];

// Helper เพื่อให้พิมพ์โค้ดด้านบนได้ง่ายขึ้น (หลีกเลี่ยงชื่อซ้ำ)
function createCacheLikert(
  prompt: string,
  category: string,
  helperText: string = '',
  isReverse: boolean = false,
) {
  return createLikert(prompt, category, helperText, isReverse);
}

// ==========================================
// 5. Scoring Interpretations (ข้อมูลสำหรับแปลผล AI & Rule-based)
// นำข้อมูลนี้ไปปรับใช้ใน CareerAssessmentScoringService
// ==========================================
export const traitInterpretations = {
  curiosity: {
    strength: 'ความอยากรู้อยากเห็นเป็นเลิศ',
    weakness: 'การเปิดรับสิ่งใหม่',
    recommendedCareers: ['นักวิจัย', 'นักคิดค้น', 'Content Creator'],
    courseTags: ['discovery', 'science', 'creative'],
  },
  self_regulation: {
    strength: 'วินัยและการควบคุมตนเองสูง',
    weakness: 'การจัดการอารมณ์และสมาธิ',
    recommendedCareers: ['ผู้จัดการ', 'แพทย์', 'โปรแกรมเมอร์'],
    courseTags: ['productivity', 'mindfulness', 'time-management'],
  },
  empathy: {
    strength: 'มีความเห็นอกเห็นใจและมนุษยสัมพันธ์ดี',
    weakness: 'การเอาใจเขามาใส่ใจเรา',
    recommendedCareers: ['นักจิตวิทยา', 'พยาบาล', 'ครู', 'HR'],
    courseTags: ['communication', 'psychology', 'teamwork'],
  },
  growth_mindset: {
    strength: 'กรอบความคิดแบบเติบโต ไม่ย่อท้อต่ออุปสรรค',
    weakness: 'การมองความล้มเหลวเป็นโอกาส',
    recommendedCareers: ['ผู้ประกอบการ (Entrepreneur)', 'นวัตกร'],
    courseTags: ['mindset', 'leadership', 'business'],
  },
  digital_readiness: {
    strength: 'ความพร้อมและเปิดรับเครื่องมือยุคดิจิทัล',
    weakness: 'การปรับตัวเข้ากับเทคโนโลยีใหม่',
    recommendedCareers: ['Digital Marketer', 'UX/UI Designer', 'IT Support'],
    courseTags: ['digital', 'tools', 'software'],
  },
  ai_fluency: {
    strength: 'คล่องแคล่วและรู้เท่าทันเทคโนโลยี AI',
    weakness: 'ทักษะการใช้ AI เพื่อทุ่นแรง',
    recommendedCareers: [
      'AI Prompt Engineer',
      'Data Analyst',
      'Software Developer',
    ],
    courseTags: ['ai', 'data', 'tech'],
  },
  leadership: {
    strength: 'มีภาวะผู้นำ กล้าตัดสินใจและพาคนไปสู่เป้าหมาย',
    weakness: 'ทักษะการบริหารจัดการคน',
    recommendedCareers: ['Project Manager', 'CEO', 'Team Lead'],
    courseTags: ['leadership', 'management', 'strategy'],
  },
  learning_agility: {
    strength: 'เรียนรู้ไว ประยุกต์ใช้สิ่งใหม่ได้อย่างรวดเร็ว',
    weakness: 'การเรียนรู้สิ่งใหม่นอก Comfort Zone',
    recommendedCareers: ['Consultant', 'Business Analyst', 'Startup Founder'],
    courseTags: ['agile', 'learning', 'innovation'],
  },
};
