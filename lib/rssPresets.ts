// Industry-specific RSS feed presets for CompanyFootprint and SocialListener
// Each industry has curated feeds for regulatory news, industry analysis, and market trends

export interface RssFeed {
  label: string;
  url: string;
}

export const INDUSTRY_RSS: Record<string, { name: string; feeds: RssFeed[] }> = {
  gambling: {
    name: "Gambling & iGaming",
    feeds: [
      { label: "Gambling Insider", url: "https://www.gamblinginsider.com/feed" },
      { label: "iGaming Business", url: "https://igamingbusiness.com/feed/" },
      { label: "UK Gambling Commission", url: "https://www.gamblingcommission.gov.uk/rss.xml" },
    ],
  },
  fintech: {
    name: "Fintech & Banking",
    feeds: [
      { label: "Finextra", url: "https://www.finextra.com/rss/headlines.aspx" },
      { label: "The Financial Brand", url: "https://thefinancialbrand.com/feed/" },
      { label: "Finovate", url: "https://finovate.com/feed/" },
    ],
  },
  saas: {
    name: "SaaS & Enterprise",
    feeds: [
      { label: "SaaStr", url: "https://www.saastr.com/feed/" },
      { label: "TechCrunch SaaS", url: "https://techcrunch.com/category/enterprise/feed/" },
      { label: "Hacker News Best", url: "https://hnrss.org/best" },
    ],
  },
  ecommerce: {
    name: "E-commerce & Retail",
    feeds: [
      { label: "Retail Dive", url: "https://www.retaildive.com/feeds/news/" },
      { label: "Practical Ecommerce", url: "https://www.practicalecommerce.com/feed" },
      { label: "Digital Commerce 360", url: "https://www.digitalcommerce360.com/feed/" },
    ],
  },
  healthcare: {
    name: "Healthcare & MedTech",
    feeds: [
      { label: "Healthcare Dive", url: "https://www.healthcaredive.com/feeds/news/" },
      { label: "MedCity News", url: "https://medcitynews.com/feed/" },
      { label: "Fierce Healthcare", url: "https://www.fiercehealthcare.com/rss/xml" },
    ],
  },
  general: {
    name: "General / Tech",
    feeds: [
      { label: "Hacker News Best", url: "https://hnrss.org/best" },
      { label: "TechCrunch", url: "https://techcrunch.com/feed/" },
      { label: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
    ],
  },
};

export const INDUSTRY_IDS = Object.keys(INDUSTRY_RSS) as (keyof typeof INDUSTRY_RSS)[];

export function getIndustryFeeds(industry: string): RssFeed[] {
  return INDUSTRY_RSS[industry]?.feeds ?? INDUSTRY_RSS.general.feeds;
}
