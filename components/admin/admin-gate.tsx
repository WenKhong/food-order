import { isAdmin } from '@/lib/admin/session';
import { listOrders } from '@/lib/orders/queries';
import { LoginForm } from './login-form';
import { OrderBoard } from './order-board';

// Decides on the server what to show. Orders are only loaded (and sent to the
// browser) after the session cookie checks out.
export async function AdminGate() {
  if (!(await isAdmin())) {
    return <LoginForm />;
  }
  return <OrderBoard orders={await listOrders()} />;
}
