const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Check current articles in database
    const currentArticles = await prisma.newsArticle.findMany({
      select: {
        id: true,
        title: true,
        source: true,
        publishedAt: true,
        scrapedAt: true
      },
      orderBy: { publishedAt: 'desc' },
      take: 10
    });

    console.log('\n📰 Current articles in database:');
    console.log('='.repeat(50));
    currentArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title.substring(0, 60)}...`);
      console.log(`   Source: ${article.source}`);
      console.log(`   Published: ${article.publishedAt}`);
      console.log(`   Scraped: ${article.scrapedAt}`);
      console.log('');
    });

    const totalCount = await prisma.newsArticle.count();
    console.log(`📊 Total articles in database: ${totalCount}`);

    // Clear all articles
    console.log('\n🗑️  Clearing all articles from database...');
    const deleteResult = await prisma.newsArticle.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.count} articles`);

    console.log('\n🎉 Database cleared! Next page refresh will fetch fresh news from your APIs.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
