import type { CSSProperties } from 'react';

const HEADER_ROW_BORDER = '1px solid #ddd';
const BODY_ROW_BORDER = '1px solid #eee';

/** Bordered full-width table (no bottom margin). */
export const tableBase: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  border: HEADER_ROW_BORDER
};

export function tableWithMarginBottom(px: number): CSSProperties {
  return { ...tableBase, marginBottom: px };
}

export const thLeft: CSSProperties = {
  textAlign: 'left',
  padding: 8,
  borderBottom: HEADER_ROW_BORDER
};

export const thRight: CSSProperties = {
  textAlign: 'right',
  padding: 8,
  borderBottom: HEADER_ROW_BORDER
};

export const tdCell: CSSProperties = {
  padding: 8,
  borderBottom: BODY_ROW_BORDER
};

export const tdCellRight: CSSProperties = {
  ...tdCell,
  textAlign: 'right'
};

export const tdCellNowrap: CSSProperties = {
  ...tdCell,
  whiteSpace: 'nowrap'
};
