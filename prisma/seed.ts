import 'dotenv';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
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
      willLearnMessages: ['You will learn how to develop websites'],
      requirements: [],
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
      willLearnMessages: ['Use React to Learn'],
      requirements: ['One computer', 'One OS'],
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
      willLearnMessages: ['Design websites effectively'],
      requirements: [],
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
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        content: 'โอเค',
        rating: 4,
        courseId: course1.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        content: 'ดี',
        rating: 5,
        courseId: course2.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        content: 'เยี่ยม',
        rating: 4,
        courseId: course3.id,
        created_at: new Date(),
        updated_at: new Date(),
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
      status: Status.ACTIVE,
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
