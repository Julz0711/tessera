import { createContext, useContext } from 'react';

/** Size multiplier for pieces, tokens and harbors on the 3D board (the "Board size" setting). */
export const PieceScale = createContext(1);

export const usePieceScale = () => useContext(PieceScale);
