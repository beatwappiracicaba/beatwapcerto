const fs = require('fs');
const path = require('path');

// Lista de arquivos que precisam ser corrigidos
const filesToFix = [
  'src/components/admin/ArtistContentManager.jsx',
  'src/components/landing/CheckoutModal.jsx',
  'src/components/admin/MarketingManager.jsx',
  'src/components/admin/MusicEditModal.jsx',
  'src/components/admin/ShowRevenueDistributor.jsx',
  'src/components/artist/CompositionsUploadModal.jsx',
  'src/components/artist/MusicUploadModal.jsx',
  'src/components/FloatingChat/ChatWindow.jsx',
  'src/components/profile/GalleryManager.jsx',
  'src/context/ChatContext.jsx',
  'src/pages/AdminCompositions.jsx',
  'src/pages/AdminSettings.jsx',
  'src/pages/DashboardArtist.jsx',
  'src/pages/DashboardCompositions.jsx',
  'src/pages/DashboardMarketing.jsx',
  'src/pages/AdminDashboard.jsx',
  'src/pages/DashboardWork.jsx',
  'src/context/DataContext.jsx',
  'src/pages/DashboardArtistProfile.jsx',
  'src/pages/SellerAgenda.jsx',
  'src/pages/SellerLeads.jsx',
  'src/pages/SellerDashboard.jsx',
  'src/pages/AlbumPage.jsx',
  'src/pages/SellerArtists.jsx',
  'src/pages/AdminSellers.jsx',
  'src/components/finance/FinanceDistributionModal.jsx',
  'src/pages/SellerFinance.jsx',
  'src/pages/PublicProfile.jsx',
  'src/pages/SellerProposals.jsx',
  'src/pages/Home.jsx',
  'src/services/aiService.js',
  'src/pages/DashboardFinance.jsx'
];

function fixFile(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Verificar se o arquivo importa 'api' do apiClient
    if (content.includes("import { api } from '../services/apiClient'")) {
      // Substituir a importação
      content = content.replace(
        "import { api } from '../services/apiClient'",
        "import { apiClient } from '../services/apiClient'"
      );
      
      // Substituir todas as chamadas de api. para apiClient.
      content = content.replace(/api\./g, 'apiClient.');
      
      // Escrever o arquivo corrigido
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Corrigido: ${filePath}`);
    } else {
      console.log(`ℹ️  Sem alterações necessárias: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
  }
}

// Processar todos os arquivos
console.log('Iniciando correção de importações...\n');
filesToFix.forEach(fixFile);
console.log('\n✅ Correção concluída!');