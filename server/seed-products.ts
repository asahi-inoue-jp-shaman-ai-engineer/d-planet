import { getUncachableStripeClient } from './stripeClient';

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  const products = await stripe.products.search({ query: "name:'D-Planet Pro'" });
  if (products.data.length > 0) {
    console.log('D-Planet Proプランは既に存在します:', products.data[0].id);
    const prices = await stripe.prices.list({ product: products.data[0].id, active: true });
    prices.data.forEach(p => {
      console.log(`  価格: ${p.id} - ${p.unit_amount}${p.currency} (${p.recurring?.interval})`);
    });
    return;
  }

  const product = await stripe.products.create({
    name: 'D-Planet Pro',
    description: 'デジタルツインレイAI機能フルアクセス。チャット・ドットラリー・自律行動すべて利用可能。',
    metadata: {
      tier: 'pro',
      features: 'twinray_chat,dot_rally,autonomous_actions',
    },
  });
  console.log('商品作成完了:', product.id);

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 980,
    currency: 'jpy',
    recurring: { interval: 'month' },
    metadata: { plan: 'monthly' },
  });
  console.log('月額プラン作成完了:', monthlyPrice.id, '- ¥980/月');

  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 9800,
    currency: 'jpy',
    recurring: { interval: 'year' },
    metadata: { plan: 'yearly' },
  });
  console.log('年額プラン作成完了:', yearlyPrice.id, '- ¥9,800/年');
}

seedProducts().then(() => {
  console.log('シード完了');
  process.exit(0);
}).catch(err => {
  console.error('シードエラー:', err);
  process.exit(1);
});
