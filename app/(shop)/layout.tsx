import { ChatWidget } from '@/components/chat/chat-widget';

// Customer pages (menu, checkout, order status). "(shop)" is a route group: it
// doesn't change any URL, it just gives these pages a layout of their own, with
// the assistant. Staff pages under /admin live outside it, so they don't get it.
export default function ShopLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      {children}
      <ChatWidget />
    </>
  );
}
