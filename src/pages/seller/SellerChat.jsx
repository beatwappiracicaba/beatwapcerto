import React, { useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { useChat } from '../../context/ChatContext';
import { MessageCircle } from 'lucide-react';

const SellerChat = () => {
  const { setIsOpen } = useChat();

  useEffect(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Chat</h1>
      <Card className="p-6 flex items-center gap-3 text-gray-300">
        <MessageCircle size={20} className="text-beatwap-gold" />
        O chat está aberto no canto inferior direito para atendimento.
      </Card>
    </div>
  );
};

export default SellerChat;
