/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://trainermilestone-blogbooster.vercel.app',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    additionalSitemaps: [],
  },
  exclude: ['/api/*', '/admin/*'],
  changefreq: 'daily',
  priority: 0.7,
};
