interface Env {
  DB: D1Database;
}

export async function onRequest(context: { env: Env; request: Request }) {
  try {
    console.log("[Manifest] Buscando configuração do negócio...");
    const businessConfig = await context.env.DB.prepare("SELECT business_name, professional_name FROM business_config WHERE id = 1").first() as any;
    
    console.log("[Manifest] Business Config:", businessConfig);
    
    const appName = businessConfig?.business_name || businessConfig?.professional_name || "PetCare Agenda";
    const shortName = appName.length > 12 ? appName.substring(0, 12) : appName;
    
    console.log("[Manifest] App Name:", appName, "Short Name:", shortName);
    
    const manifest = {
      name: appName,
      short_name: shortName,
      description: `Sistema de agendamento - ${appName}`,
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#3b82f6",
      orientation: "portrait",
      icons: [
        {
          src: "/icon.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any maskable"
        },
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ],
      categories: ["business", "lifestyle"],
      shortcuts: [
        {
          name: "Agendar Serviço",
          short_name: "Agendar",
          description: "Agendar um novo serviço",
          url: "/",
          icons: [{ src: "/icon.svg", sizes: "any" }]
        },
        {
          name: "Área Profissional",
          short_name: "Profissional",
          description: "Acessar área do profissional",
          url: "/professional",
          icons: [{ src: "/icon.svg", sizes: "any" }]
        }
      ]
    };
    
    return new Response(JSON.stringify(manifest), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error("[Manifest] Error:", error);
    // Fallback para manifest padrão
    const fallbackManifest = {
      name: "PetCare Agenda",
      short_name: "PetCare",
      description: "Sistema de agendamento para pet shops",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#3b82f6",
      orientation: "portrait",
      icons: [
        {
          src: "/icon.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any maskable"
        }
      ]
    };
    
    return new Response(JSON.stringify(fallbackManifest), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
