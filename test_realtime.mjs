import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gvhrgefcjevnempnseqo.supabase.co',
  'sb_publishable_qAj_UXre0VU_c3OkXeYMZg_zzQk550R'
);

const channel = supabase.channel('room_1000', {
  config: { presence: { key: 'test_player' } }
});

channel
  .on('presence', { event: 'sync' }, () => {
    console.log('Presence sync:', channel.presenceState());
  })
  .subscribe(async (status) => {
    console.log('Status:', status);
    if (status === 'SUBSCRIBED') {
      const resp = await channel.track({ name: 'test_player' });
      console.log('Track response:', resp);
    }
  });

setTimeout(() => {
  process.exit(0);
}, 6000);
