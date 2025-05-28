export const sponge = <Pores extends object, Result>(
    pores   : Pores, 
    squeeze : (filled : Pores) => Result
  ) => {
  const sponge : Partial<Pores> = {};
  const absorb = (water : Partial<Pores>) => {
    soak(water);
    return full() 
            ? squeeze(sponge as Pores) 
            : absorb;
  }
  const soak      = (water : Partial<Pores>) => Object.assign(sponge, water);
  const filled    = (pore  : string        ) => pore in sponge;
  const full = () => 
    Object
      .keys (pores)
      .every(filled);
  return absorb;
}