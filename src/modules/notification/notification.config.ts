export const NOTIFICATION_TEMPLATES = {
  'RESTAURANT': {
    'WAIT_FOOD': {
      channel: 'SMS',
      template: 'Welcome {customerName}, your queue {queueNo} is confirmed. Please wait for your table.'
    },
    'EATING': {
      channel: 'LINE',
      template: 'Your table is ready! Please proceed to the host stand.'
    }
  },
  'CLINIC': {
    'WAIT_DOCTOR': {
      channel: 'PUSH',
      template: 'Queue {queueNo}: Please proceed to Screening Room 2.'
    },
    'IN_ROOM': {
        channel: 'VOICE',
        template: 'Queue Number {queueNo}, please come to Room 5.'
    }
  }
};
