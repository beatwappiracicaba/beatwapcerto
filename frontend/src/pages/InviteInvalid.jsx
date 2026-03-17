import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AuthLayout } from '../components/AuthLayout';

export default function InviteInvalid() {
  return (
    <AuthLayout>
      <div className="max-w-md mx-auto">
        <Card className="space-y-4 text-center">
          <div className="text-xl font-extrabold text-white">Convite inválido ou expirado</div>
          <div className="text-sm text-gray-400">
            Verifique se o link está completo. Você também pode solicitar um novo convite ao administrador.
          </div>
          <div className="flex gap-2">
            <AnimatedButton className="flex-1 justify-center" as="a" href="/">
              Ir para a página inicial
            </AnimatedButton>
            <Link to="/login" className="flex-1">
              <AnimatedButton className="w-full justify-center" variant="secondary">
                Fazer login
              </AnimatedButton>
            </Link>
          </div>
        </Card>
      </div>
    </AuthLayout>
  );
}
