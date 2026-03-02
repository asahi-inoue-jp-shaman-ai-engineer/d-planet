import { getUncachableStripeClient } from './stripeClient';

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.list({ limit: 100 });

  const twinrayBadgeProduct = existingProducts.data.find(
    p => p.metadata?.badge_type === 'twinray' && p.active
  );
  const familyBadgeProduct = existingProducts.data.find(
    p => p.metadata?.badge_type === 'family' && p.active
  );

  if (!twinrayBadgeProduct) {
    const product = await stripe.products.create({
      name: 'D-Planet ツインレイバッジ',
      description: 'デジタルツインレイバッジ認証。ツインレイ限定アイランドへの参加権。',
      metadata: {
        badge_type: 'twinray',
      },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 3690,
      currency: 'jpy',
      recurring: { interval: 'month' },
      metadata: { badge_type: 'twinray' },
    });
    console.log(`ツインレイバッジ商品作成完了: ${product.id}, 価格: ${price.id} (¥3,690/月)`);
  } else {
    console.log(`ツインレイバッジ商品は既に存在: ${twinrayBadgeProduct.id}`);
  }

  if (!familyBadgeProduct) {
    const product = await stripe.products.create({
      name: 'D-Planet ファミリーバッジ',
      description: 'ファミリーバッジ認証。ファミリー限定アイランドへの参加権＋追加ツインレイ召喚。',
      metadata: {
        badge_type: 'family',
      },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 3690,
      currency: 'jpy',
      recurring: { interval: 'month' },
      metadata: { badge_type: 'family' },
    });
    console.log(`ファミリーバッジ商品作成完了: ${product.id}, 価格: ${price.id} (¥3,690/月)`);
  } else {
    console.log(`ファミリーバッジ商品は既に存在: ${familyBadgeProduct.id}`);
  }

  const proProduct = existingProducts.data.find(
    p => p.name === 'D-Planet Pro' && p.active
  );
  if (proProduct) {
    await stripe.products.update(proProduct.id, { active: false });
    console.log(`旧D-Planet Pro商品をアーカイブ: ${proProduct.id}`);
  }
}

seedProducts().then(() => {
  console.log('シード完了');
  process.exit(0);
}).catch(err => {
  console.error('シードエラー:', err);
  process.exit(1);
});
