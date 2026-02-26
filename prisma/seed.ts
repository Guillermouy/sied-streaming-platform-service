import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const event1 = await prisma.event.create({
    data: {
      title: 'Avances en Endoscopía Digestiva 2026',
      shortDescription:
        'Conferencia sobre las últimas técnicas y tecnologías en endoscopía digestiva.',
      longDescription:
        'Únase a los principales expertos de la región para explorar los avances más recientes en endoscopía digestiva. Esta conferencia cubrirá desde nuevas técnicas de diagnóstico hasta procedimientos terapéuticos innovadores.',
      speakers: 'Dr. María González, Dr. Carlos Rodríguez',
      date: new Date('2026-04-15'),
      startTime: '14:00',
      endTime: '16:00',
      timezone: 'America/Argentina/Buenos_Aires',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      status: 'PUBLISHED',
      registrationEnabled: true,
      liveEnabled: false,
      accessText: 'Unirse al evento en vivo',
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: 'Workshop: Técnicas de Polipectomía',
      shortDescription:
        'Workshop práctico sobre técnicas modernas de polipectomía endoscópica.',
      longDescription:
        'En este workshop práctico, aprenderá las técnicas más actuales para la resección de pólipos colorrectales, incluyendo polipectomía fría, EMR y ESD. Dirigido a endoscopistas en formación y especialistas que deseen actualizar sus conocimientos.',
      speakers: 'Dr. Ana López, Dr. Roberto Martínez, Dra. Laura Fernández',
      date: new Date('2026-05-20'),
      startTime: '10:00',
      endTime: '12:30',
      timezone: 'America/Argentina/Buenos_Aires',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      status: 'DRAFT',
      registrationEnabled: true,
      liveEnabled: false,
      accessText: 'Acceder al workshop',
    },
  });

  console.log('Seed completed:', { event1: event1.id, event2: event2.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
