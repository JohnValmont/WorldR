import fs from 'fs';
import path from 'path';

const files = [
  '0001_auth_schema.sql',
  '0062_scandal_system.sql',
  '0063_campaign_command_object.sql',
  '0064_interest_group_persistence.sql',
  '0065_media_ecosystem.sql',
  '0066_legacy_system.sql',
  '0082_corporate_petitions.sql'
];

const basePath = path.join(__dirname, '..', 'database', 'migrations');

for (const file of files) {
  const filePath = path.join(basePath, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (file === '0001_auth_schema.sql') {
      content = content.replace(
        /END;\r?\n\$\$ LANGUAGE plpgsql;/g,
        'END;\n$$ LANGUAGE plpgsql SET search_path = public;'
      );
    } else {
      content = content.replace(
        /END;\r?\n\$\$ LANGUAGE plpgsql;/g,
        'END;\n$$ LANGUAGE plpgsql SET search_path = public;'
      );
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
}
