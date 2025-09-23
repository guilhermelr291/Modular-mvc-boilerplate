import { Router } from 'express';
import { readdirSync, Dirent } from 'fs';
import { join } from 'path';
import { Application } from 'express';

export default (app: Application) => {
    const router = Router();
    app.use('/api', router);

    const modulesPath = join(__dirname, '../modules');

    const loadRoutes = (dir: string) => {
       
        
        try {
            const files: Dirent[] = readdirSync(dir, { withFileTypes: true });
           
            
            files.forEach(async (file: Dirent) => {
                const fullPath = join(dir, file.name);
               
                
                if (file.isDirectory()) {
                    console.log(`📁 Entrando no diretório: ${fullPath}`);
                    loadRoutes(fullPath);
                } else if (file.name.endsWith('routes.ts') || file.name.endsWith('routes.js')) {
                   
                    try {
                        const routeModule = await import(fullPath);
                        routeModule.default(router);
                       
                    } catch (error) {
                        console.error(`❌ Erro ao importar: ${fullPath}`, error);
                    }
                }
            });
        } catch (error) {
            console.error(`💥 ERRO CRÍTICO ao ler diretório ${dir}:`, error);
        }
    };

    loadRoutes(modulesPath);
};
