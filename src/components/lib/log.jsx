export const log = {
  info:  (msg, ctx={}) => console.log(JSON.stringify({lvl:'info',  msg, ts: new Date().toISOString(), ...ctx})),
  warn:  (msg, ctx={}) => console.warn(JSON.stringify({lvl:'warn',  msg, ts: new Date().toISOString(), ...ctx})),
  error: (msg, ctx={}) => console.error(JSON.stringify({lvl:'error', msg, ts: new Date().toISOString(), ...ctx})),
};