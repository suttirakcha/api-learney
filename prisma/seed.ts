import 'dotenv';
// import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  Role,
  Status,
} from '../src/database/generated/prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
// const pool = new Pool({ connectionString });
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
async function main() {
  console.log('🌱 Seeding...');

  // -------------------------
  // 👤 USERS (safe)
  // -------------------------
  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      fullname: 'Admin',
      email: 'admin@test.com',
      password: '1234',
      role: Role.ADMIN,
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@test.com' },
    update: {},
    create: {
      fullname: 'John Instructor',
      email: 'instructor@test.com',
      password: '1234',
      role: Role.INSTRUCTOR,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@test.com' },
    update: {},
    create: {
      fullname: 'Student User',
      email: 'student@test.com',
      password: '1234',
      role: Role.USER,
    },
  });

  // -------------------------
  // 🧹 ล้างข้อมูลเก่าก่อน (กันซ้ำ)
  // -------------------------
  await prisma.review.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.course.deleteMany();

  // -------------------------
  // 📚 COURSES
  // -------------------------
  const course1 = await prisma.course.create({
    data: {
      courseName: 'Complete Web Dev Bootcamp',
      category: 'Web Dev',
      description: 'Fullstack course',
      thumbnail: 'https://placehold.co/600x400',
      price: 8900,
      discount: 0,
      tags: ['web', 'fullstack'],
      status: Status.ACTIVE,
      instructorId: instructor.id,
      totalLessons: 10,
      totalDuration: '5h',
      totalStudents: 98,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      courseName: 'Advanced React & Redux',
      category: 'Web Dev',
      description: 'React advance',
      thumbnail: 'https://placehold.co/600x400',
      price: 6500,
      discount: 0,
      tags: ['react'],
      status: Status.ACTIVE,
      instructorId: instructor.id,
      totalLessons: 8,
      totalDuration: '4h',
      totalStudents: 56,
    },
  });

  const course3 = await prisma.course.create({
    data: {
      courseName: 'UI/UX Design Masterclass',
      category: 'Design',
      description: 'Design course',
      thumbnail: 'https://placehold.co/600x400',
      price: 7900,
      discount: 0,
      tags: ['design'],
      status: Status.ACTIVE,
      instructorId: instructor.id,
      totalLessons: 12,
      totalDuration: '6h',
      totalStudents: 82,
    },
  });

  // -------------------------
  // ⭐ REVIEWS
  // -------------------------
  await prisma.review.createMany({
    data: [
      { content: 'ดีมาก', rating: 5, courseId: course1.id },
      { content: 'โอเค', rating: 4, courseId: course1.id },
      { content: 'ดี', rating: 5, courseId: course2.id },
      { content: 'เยี่ยม', rating: 4, courseId: course3.id },
    ],
  });

  // -------------------------
  // 🛒 CART (safe)
  // -------------------------
  const cart = await prisma.cart.upsert({
    where: { id: 'fixed-cart-id' },
    update: {},
    create: {
      id: 'fixed-cart-id',
      userId: student.id,
      total: 8900,
      subtotal: 8900,
    },
  });

  // -------------------------
  // 🧾 CART ITEMS
  // -------------------------
  await prisma.cartItem.createMany({
    data: [
      { cartId: cart.id, courseId: course1.id },
      { cartId: cart.id, courseId: course2.id },
    ],
  });

  // -------------------------
  // 💸 PAYMENT (1 ต่อ cart)
  // -------------------------
  await prisma.payment.upsert({
    where: { cartId: cart.id },
    update: {},
    create: {
      cartId: cart.id,
      userId: student.id,
      amount: 8900 + 6500,
      status: Status.ACTIVE,
    },
  });

  console.log('✅ Seed สำเร็จ!');
}
main()
  .then(async () => {
    await prisma.$disconnect();
    // await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    // await pool.end();
    process.exit(1);
  });
