import jwt from 'jsonwebtoken';
import User from '@/models/User';

// Mirrors the GET scoping: admins and stock managers can update any order,
// pharmacies/pharmacists the orders listing their business (or their own), and
// everyone else only orders they placed.
export async function sessionCanUpdateOrder(
  session: jwt.JwtPayload,
  order: { businesses?: string[]; user?: unknown },
): Promise<boolean> {
  const user = await User.findById(session.userId);
  const role = user?.role || session.role || 'customer';
  const ownsOrder = !!order.user && String(order.user) === String(session.userId);
  if (role === 'admin' || role === 'stockManager') return true;
  if (role === 'pharmacy' || role === 'pharmacist') {
    return ownsOrder || (!!user?.businessName && (order.businesses || []).includes(user.businessName));
  }
  return ownsOrder;
}
