import { robinhoodBrandLockup, robinhoodBrandMark, SUBJECT_ICONS } from '../components/brand.js';

export const BRAND_ASSETS = {
  appName: 'The Robinhood for Good',
  wordmarkTop: 'Robinhood',
  wordmarkBottom: 'For Good',
  logo: {
    mark: (size = 24) => robinhoodBrandMark(size),
    lockup: (options = {}) => robinhoodBrandLockup(options),
  },
};

export const SUBJECT_ASSETS = {
  os: {
    id: 'os',
    title: 'Operating Systems',
    logo: '',
    color: SUBJECT_ICONS.os.color,
    fallback: (size = 20) => SUBJECT_ICONS.os.icon(size),
  },
  cn: {
    id: 'cn',
    title: 'Computer Networks',
    logo: '',
    color: SUBJECT_ICONS.cn.color,
    fallback: (size = 20) => SUBJECT_ICONS.cn.icon(size),
  },
  dbms: {
    id: 'dbms',
    title: 'DBMS',
    logo: '',
    color: SUBJECT_ICONS.dbms.color,
    fallback: (size = 20) => SUBJECT_ICONS.dbms.icon(size),
  },
  oops: {
    id: 'oops',
    title: 'OOPs',
    logo: '',
    color: SUBJECT_ICONS.oops.color,
    fallback: (size = 20) => SUBJECT_ICONS.oops.icon(size),
  },
  'system-design': {
    id: 'system-design',
    title: 'System Design',
    logo: '',
    color: SUBJECT_ICONS.sd.color,
    fallback: (size = 20) => SUBJECT_ICONS.sd.icon(size),
  },
  dsa: {
    id: 'dsa',
    title: 'DSA',
    logo: '',
    color: SUBJECT_ICONS.dsa.color,
    fallback: (size = 20) => SUBJECT_ICONS.dsa.icon(size),
  },
};

export function getSubjectAsset(subjectId) {
  if (!subjectId) return SUBJECT_ASSETS.os;
  return SUBJECT_ASSETS[subjectId] || SUBJECT_ASSETS.os;
}

