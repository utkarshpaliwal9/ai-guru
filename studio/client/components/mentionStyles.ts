import { MentionsInputStyle } from 'react-mentions';

export default {
  control: {
    backgroundColor: '#fff',
    fontSize: 14,
    fontWeight: 'normal',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
  },

  '&multiLine': {
    control: {
      minHeight: 63,
    },
    highlighter: {
      padding: 12,
    },
    input: {
      padding: 12,
      outline: 'none',
    },
  },

  '&singleLine': {
    display: 'inline-block',
    width: 180,

    highlighter: {
      padding: 1,
      border: '2px inset transparent',
    },
    input: {
      padding: 1,
      border: '2px inset',
    },
  },

  suggestions: {
    list: {
      backgroundColor: 'white',
      border: '1px solid rgba(0,0,0,0.15)',
      borderRadius: '0.5rem',
      fontSize: 14,
      maxHeight: '250px',
      overflowY: 'auto',
      boxShadow: '0 -4px 6px -1px rgb(0 0 0 / 0.1), 0 -2px 4px -2px rgb(0 0 0 / 0.1)',
      bottom: '70px',
    },
    item: {
      padding: '10px 12px',
      '&focused': {
        backgroundColor: '#f3f4f6',
      },
    },
  },
} as MentionsInputStyle; 