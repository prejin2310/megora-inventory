export const ORDER_STATUSES = [
  'Received',
  'Packed',
  'Waiting for Pickup',
  'In Transit',
  'Delivered',
  'Cancelled',
  'Returned',
]

export const ORDER_STATUS_FLOW = {
  Received: ['Packed', 'Cancelled'],
  Packed: ['Waiting for Pickup', 'Cancelled'],
  'Waiting for Pickup': ['In Transit', 'Cancelled'],
  'In Transit': ['Delivered', 'Returned'],
  Delivered: [],
  Cancelled: [],
  Returned: [],
}
