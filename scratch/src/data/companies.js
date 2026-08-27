// ROBINHOOD - Company Database (80+ companies)
const colors = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#f59e0b','#22c55e','#14b8a6','#06b6d4','#3b82f6','#d946ef','#a855f7','#10b981','#0ea5e9','#e11d48','#16a34a','#0d9488','#2563eb','#7c3aed','#db2777'];

function c(name,industry,tier,problems,color,rounds,difficulty){
  return{id:name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name,industry,tier,problemCount:problems,color:color||colors[Math.floor(Math.random()*colors.length)],rounds:rounds||['OA','Phone','Onsite x2-3'],avgDifficulty:difficulty||'Medium'};
}

export const companies = [
// FAANG / MAANG
c('Google','Big Tech','FAANG',180,'#4285f4',['Phone Screen','2-3 Onsite','Team Match'],'Medium-Hard'),
c('Amazon','Big Tech','FAANG',200,'#ff9900',['OA','Phone','4 Onsite (LP+DSA)'],'Medium'),
c('Meta','Big Tech','FAANG',160,'#0668E1',['Phone Screen','2 Onsite','System Design'],'Medium-Hard'),
c('Apple','Big Tech','FAANG',90,'#555555',['Phone','3 Onsite','Domain Round'],'Medium'),
c('Microsoft','Big Tech','FAANG',140,'#00a4ef',['OA','Phone','3-4 Onsite'],'Medium'),
c('Netflix','Big Tech','FAANG',40,'#e50914',['Phone','Onsite','Culture Fit'],'Hard'),

// Big Tech
c('Uber','Big Tech','Tier-1',80,'#000000',['OA','Phone','3 Onsite'],'Medium-Hard'),
c('Airbnb','Big Tech','Tier-1',50,'#ff5a5f',['Phone','2 Onsite','Cross-Functional'],'Medium-Hard'),
c('Stripe','Fintech','Tier-1',45,'#635bff',['Phone','2 Onsite','Debugging'],'Medium-Hard'),
c('Spotify','Big Tech','Tier-1',35,'#1db954',['Phone','Onsite','System Design'],'Medium'),
c('Twitter / X','Big Tech','Tier-1',55,'#1da1f2',['Phone','Onsite x2','Design'],'Medium'),
c('LinkedIn','Big Tech','Tier-1',70,'#0a66c2',['Phone','3 Onsite','Design'],'Medium'),
c('Snap','Big Tech','Tier-1',30,'#fffc00',['Phone','2 Onsite'],'Medium'),
c('Pinterest','Big Tech','Tier-1',25,'#e60023',['Phone','Onsite x2'],'Medium'),
c('Dropbox','Big Tech','Tier-1',30,'#0061ff',['Phone','2 Onsite','Design'],'Medium-Hard'),
c('Salesforce','Big Tech','Tier-1',40,'#00a1e0',['OA','Phone','Onsite'],'Medium'),
c('Adobe','Big Tech','Tier-1',60,'#ff0000',['OA','Phone','2 Onsite'],'Medium'),
c('Oracle','Big Tech','Tier-1',50,'#f80000',['OA','Phone','Onsite'],'Medium'),
c('VMware','Big Tech','Tier-2',30,'#717db7',['OA','Phone','Onsite'],'Medium'),
c('Cisco','Big Tech','Tier-2',25,'#1ba0d8',['OA','Phone','Onsite'],'Medium'),
c('Intel','Big Tech','Tier-2',20,'#0071c5',['OA','Phone','Onsite'],'Medium'),
c('Nvidia','Big Tech','Tier-1',40,'#76b900',['Phone','2 Onsite'],'Medium-Hard'),
c('Qualcomm','Big Tech','Tier-2',20,'#3253dc',['OA','Phone','Onsite'],'Medium'),
c('Samsung','Big Tech','Tier-2',35,'#1428a0',['OA','Phone','Onsite'],'Medium'),

// Unicorns
c('Databricks','Cloud','Tier-1',40,'#ff3621',['Phone','2 Onsite','ML Round'],'Hard'),
c('Snowflake','Cloud','Tier-1',30,'#29b5e8',['Phone','2 Onsite'],'Medium-Hard'),
c('Cloudflare','Cloud','Tier-1',25,'#f38020',['Phone','Onsite'],'Medium'),
c('Palantir','Big Tech','Tier-1',50,'#101113',['OA','Phone','Onsite','Decomposition'],'Hard'),
c('Figma','Design Tech','Tier-1',20,'#f24e1e',['Phone','Onsite','Design'],'Medium'),
c('Notion','Productivity','Tier-1',15,'#000000',['Phone','Onsite','Product'],'Medium'),
c('ByteDance','Big Tech','Tier-1',70,'#000000',['OA','Phone','2 Onsite'],'Medium-Hard'),
c('Shopify','E-Commerce','Tier-1',35,'#96bf48',['OA','Phone','Onsite'],'Medium'),
c('Canva','Design Tech','Tier-1',25,'#00c4cc',['OA','Phone','Onsite'],'Medium'),
c('Confluent','Cloud','Tier-2',15,'#000000',['Phone','Onsite'],'Medium-Hard'),
c('HashiCorp','Cloud','Tier-2',15,'#000000',['Phone','Onsite','Infra'],'Medium'),
c('Datadog','Cloud','Tier-1',25,'#632ca6',['Phone','Onsite'],'Medium-Hard'),

// Fintech / HFT / Trading
c('Goldman Sachs','Finance','Tier-1',80,'#6f9bd1',['OA','Phone','Super Day'],'Medium-Hard'),
c('Morgan Stanley','Finance','Tier-1',50,'#003986',['OA','Phone','Super Day'],'Medium'),
c('JP Morgan','Finance','Tier-1',60,'#003087',['OA','Phone','Super Day'],'Medium'),
c('Citadel','HFT','Tier-1',40,'#000000',['OA','Phone','Onsite x3'],'Hard'),
c('Two Sigma','HFT','Tier-1',35,'#000000',['OA','Phone','Onsite x3'],'Hard'),
c('Jane Street','HFT','Tier-1',30,'#000000',['Phone','Onsite x4','Math'],'Very Hard'),
c('DE Shaw','HFT','Tier-1',40,'#003b71',['OA','Phone','Onsite x3'],'Hard'),
c('Tower Research','HFT','Tier-1',25,'#000000',['OA','Phone','Onsite'],'Hard'),
c('Optiver','HFT','Tier-1',20,'#001b71',['OA','Math Test','Onsite'],'Hard'),
c('IMC Trading','HFT','Tier-1',15,'#003893',['Math Test','Phone','Onsite'],'Hard'),
c('Akuna Capital','HFT','Tier-2',15,'#000000',['OA','Phone','Onsite'],'Hard'),
c('Jump Trading','HFT','Tier-1',15,'#000000',['OA','Phone','Onsite'],'Hard'),
c('HRT','HFT','Tier-1',10,'#000000',['OA','Phone','Onsite'],'Very Hard'),
c('Virtu Financial','HFT','Tier-2',10,'#003399',['OA','Phone','Onsite'],'Hard'),
c('PayPal','Fintech','Tier-1',40,'#003087',['OA','Phone','Onsite'],'Medium'),
c('Square / Block','Fintech','Tier-1',30,'#000000',['Phone','Onsite x2'],'Medium'),

// Indian Tech
c('Flipkart','E-Commerce','Tier-1',60,'#2874f0',['OA','Phone','2 Onsite'],'Medium-Hard'),
c('Swiggy','Food Tech','Tier-1',30,'#fc8019',['OA','Phone','Onsite'],'Medium'),
c('Zomato','Food Tech','Tier-1',25,'#cb202d',['OA','Phone','Onsite'],'Medium'),
c('Paytm','Fintech','Tier-1',30,'#00baf2',['OA','Phone','Onsite'],'Medium'),
c('CRED','Fintech','Tier-1',20,'#000000',['OA','Phone','Onsite'],'Medium-Hard'),
c('Zerodha','Fintech','Tier-1',15,'#387ed1',['Phone','Onsite'],'Medium'),
c('Groww','Fintech','Tier-1',15,'#00d09c',['OA','Phone','Onsite'],'Medium'),
c('Meesho','E-Commerce','Tier-2',20,'#570741',['OA','Phone','Onsite'],'Medium'),
c('Dream11','Gaming','Tier-1',20,'#d32f2f',['OA','Phone','Onsite'],'Medium'),
c('Ola','Transport','Tier-2',25,'#4caf50',['OA','Phone','Onsite'],'Medium'),
c('Myntra','E-Commerce','Tier-2',20,'#ff3f6c',['OA','Phone','Onsite'],'Medium'),
c('BookMyShow','Entertainment','Tier-2',15,'#c4242b',['OA','Phone','Onsite'],'Medium'),
c('Razorpay','Fintech','Tier-1',25,'#072654',['OA','Phone','Onsite'],'Medium'),
c('PhonePe','Fintech','Tier-1',20,'#5f259f',['OA','Phone','Onsite'],'Medium'),

// Service Companies
c('TCS','Service','Tier-3',20,'#2d2d8a',['OA','Interview'],'Easy-Medium'),
c('Infosys','Service','Tier-3',20,'#007cc3',['OA','Interview'],'Easy-Medium'),
c('Wipro','Service','Tier-3',15,'#3f1b80',['OA','Interview'],'Easy-Medium'),
c('Cognizant','Service','Tier-3',15,'#0033a1',['OA','Interview'],'Easy-Medium'),
c('Accenture','Service','Tier-2',20,'#a100ff',['OA','Interview','GD'],'Easy-Medium'),
c('Capgemini','Service','Tier-3',15,'#0070ad',['OA','Interview'],'Easy-Medium'),
c('HCL','Service','Tier-3',10,'#0078d7',['OA','Interview'],'Easy-Medium'),
c('Tech Mahindra','Service','Tier-3',10,'#c5003e',['OA','Interview'],'Easy-Medium'),

// Others
c('Atlassian','Productivity','Tier-1',40,'#0052cc',['OA','Phone','2 Onsite','Values'],'Medium'),
c('Intuit','Fintech','Tier-1',35,'#365ebf',['Phone','Onsite x2'],'Medium'),
c('Twilio','Cloud','Tier-2',20,'#f22f46',['Phone','Onsite'],'Medium'),
c('Zoom','Communication','Tier-2',15,'#2d8cff',['Phone','Onsite'],'Medium'),
c('Expedia','Travel','Tier-2',25,'#00355f',['OA','Phone','Onsite'],'Medium'),
c('Booking.com','Travel','Tier-1',30,'#003580',['OA','Phone','Onsite'],'Medium'),
c('eBay','E-Commerce','Tier-2',25,'#e53238',['OA','Phone','Onsite'],'Medium'),
c('Lyft','Transport','Tier-1',30,'#ff00bf',['Phone','2 Onsite'],'Medium-Hard'),
c('DoorDash','Delivery','Tier-1',30,'#ff3008',['OA','Phone','2 Onsite'],'Medium-Hard'),
c('Instacart','Delivery','Tier-1',20,'#43b02a',['Phone','Onsite'],'Medium'),
c('Coinbase','Crypto','Tier-1',25,'#0052ff',['Phone','Onsite x2'],'Medium-Hard'),
c('Roblox','Gaming','Tier-1',20,'#000000',['Phone','Onsite x2'],'Medium-Hard'),
];

export function getCompanyById(id) {
  return companies.find(c => c.id === id);
}

export function getCompaniesByTier(tier) {
  return companies.filter(c => c.tier === tier);
}

export function getCompaniesByIndustry(industry) {
  return companies.filter(c => c.industry === industry);
}

export function searchCompanies(query) {
  const q = query.toLowerCase();
  return companies.filter(c => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q));
}

export default companies;
