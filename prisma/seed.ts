import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PaymentStatus,
  PrismaClient,
  Role,
  Status,
} from '../src/database/generated/prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding...');

  // =========================
  // 🧹 ล้าง user เก่าทิ้งก่อน
  // =========================
  await prisma.review.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany(); // 🔥 สำคัญ

  // ล้างข้อมูล Career Assessment เก่า (ถ้ามี)
  await prisma.careerAssessmentResult.deleteMany();
  await prisma.careerAssessmentSession.deleteMany();
  await prisma.careerAssessmentQuestion.deleteMany();
  await prisma.career.deleteMany();

  // =========================
  // 🎯 CAREER ASSESSMENT DATA
  // =========================
  const careers = await prisma.career.createMany({
    data: [
      {
        slug: 'frontend-developer',
        name: { th: 'Frontend Developer', en: 'Frontend Developer' },
        summary: {
          th: 'อาชีพพัฒนาเว็บหน้า UI/UX',
          en: 'Frontend web UI/UX developer',
        },
        image: 'frontend',
        salaryRange: '50,000 - 120,000',
        requiredSkills: ['React', 'HTML/CSS', 'JavaScript', 'UI/UX'],
      },
      {
        slug: 'backend-developer',
        name: { th: 'Backend Developer', en: 'Backend Developer' },
        summary: {
          th: 'อาชีพพัฒนาเซิร์ฟเวอร์และฐานข้อมูล',
          en: 'Backend server and DB developer',
        },
        image: 'backend',
        salaryRange: '60,000 - 150,000',
        requiredSkills: ['Node.js', 'Python', 'Database', 'API'],
      },
      {
        slug: 'fullstack-developer',
        name: { th: 'Fullstack Developer', en: 'Fullstack Developer' },
        summary: {
          th: 'อาชีพพัฒนาเว็บทั้ง Frontend และ Backend',
          en: 'Fullstack web developer',
        },
        image: 'fullstack',
        salaryRange: '80,000 - 200,000',
        requiredSkills: ['React', 'Node.js', 'Database', 'DevOps'],
      },
    ],
  });

  // =========================
  // 🔐 hash password
  // =========================
  const password = await bcrypt.hash('123456', 10);

  // =========================
  // 👤 USERS (3 ROLE ครบ)
  // =========================

  await prisma.user.create({
    data: {
      fullname: 'Admin',
      email: 'admin@test.com',
      password,
      role: Role.ADMIN,
    },
  });

  const instructor = await prisma.user.create({
    data: {
      fullname: 'Instructor A',
      email: 'instructor@test.com',
      password,
      role: Role.INSTRUCTOR,
    },
  });

  const student = await prisma.user.create({
    data: {
      fullname: 'Student User',
      email: 'student@test.com',
      password,
      role: Role.USER,
    },
  });

  // =========================
  // 📚 COURSES
  // =========================
  const course1 = await prisma.course.create({
    data: {
      courseName: 'Complete Web Dev Bootcamp',
      category: 'Web Dev',
      description: 'Fullstack course',
      thumbnail:
        'https://res.cloudinary.com/dxggc6pvz/image/upload/v1774557163/red_ovxuru.jpg',
      price: 8900,
      discount: 0,
      tags: ['web', 'fullstack'],
      status: Status.ACTIVE,
      instructorId: instructor.id,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      courseName: 'Advanced React & Redux',
      category: 'Web Dev',
      description: 'React advance',
      thumbnail:
        'https://res.cloudinary.com/dxggc6pvz/image/upload/v1774557162/green_pyjvnz.jpg',
      price: 6500,
      discount: 0,
      tags: ['react'],
      status: Status.ACTIVE,
      instructorId: instructor.id,
    },
  });

  const course3 = await prisma.course.create({
    data: {
      courseName: 'UI/UX Design Masterclass',
      category: 'Design',
      description: 'Design course',
      thumbnail:
        'https://res.cloudinary.com/dxggc6pvz/image/upload/v1774557869/pink1_cnqvpv.jpg',
      price: 7900,
      discount: 0,
      tags: ['design'],
      status: Status.ACTIVE,
      instructorId: instructor.id,
    },
  });

  // =========================
  // ⭐ REVIEWS
  // =========================
  await prisma.review.createMany({
    data: [
      {
        content: 'ดีมาก',
        rating: 5,
        courseId: course1.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        content: 'โอเค',
        rating: 4,
        courseId: course1.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        content: 'ดี',
        rating: 5,
        courseId: course2.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        content: 'เยี่ยม',
        rating: 4,
        courseId: course3.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });

  // =========================
  // 🛒 CART
  // =========================
  const cart = await prisma.cart.create({
    data: {
      userId: student.id,
      total: 15400,
      subtotal: 15400,
    },
  });

  // =========================
  // 🧾 CART ITEMS
  // =========================
  await prisma.cartItem.createMany({
    data: [
      { cartId: cart.id, courseId: course1.id },
      { cartId: cart.id, courseId: course2.id },
    ],
  });

  // =========================
  // 💸 PAYMENT
  // =========================
  await prisma.payment.create({
    data: {
      cartId: cart.id,
      userId: student.id,
      amount: 15400,
      status: PaymentStatus.SUCCESS,
    },
  });

  console.log('✅ Seed สำเร็จ!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
