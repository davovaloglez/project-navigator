-- Reseed del registro `equipo` desde la hoja final (mocks/final-version/...-equipo.csv).
-- DESTRUCTIVO: borra TODO `equipo` y lo recarga. id = columna `user` (local-part).
-- Aplicar:  turso db shell <db> < src/db/seeds/equipo-2026-05-25.sql
--
-- Cambios vs reseed 2026-05-18: +Maricruz (mhernandez, inactiva/sin banda),
-- +Edgar Arzate (earzate, rol 'ceo', raíz de la jerarquía). Ahora la hoja trae
-- jefe_id (local-part) => manager_id directo, sin resolver por nombre.

-- (1) Rol nuevo que la hoja usa y no estaba en el catálogo.
insert or ignore into "roles" ("id","name") values ('ceo','CEO');

-- (2) Limpia el registro.
delete from "equipo";

-- (3) Desvincula todos los logins (se re-vinculan en el paso 6 por email).
update "user" set "equipoId" = NULL;

-- (4) Inserta las 34 personas. manager_id NULL aquí (se resuelve en 5).
--     active=0 sólo para registros sin banda NI departamento (Maricruz).
insert into "equipo" ("id","full_name","nickname","role_id","title","department","manager_id","email","active") values
 ('aserrano','Alejandra Lolita Serrano Alcantara','Ale','desarrollador-jr','Full-Stack Developer (Innovative Tech Explorer)','Tech Ambition',NULL,'aserrano@bit.lat',1),
 ('alara','Alfredo Lara Dotor','Alfred','desarrollador-jr','Full-Stack Developer (Innovative Tech Explorer)','Tech Ambition',NULL,'alara@bit.lat',1),
 ('aaguilar','Ana Luz Aguilar Pecina','Luz','project-manager','Project Manager (Successful Project Explorer)','Growth Experiences',NULL,'aaguilar@bit.lat',1),
 ('dperez','Dulce Lucero Pérez Salazar','Dulce','ed-tech','Consultor de Éxito del Cliente (Customer Success Explorer)','Allies Networking',NULL,'dperez@bit.lat',1),
 ('etorres','Edgar Arturo Torres Hernandez','Edgar','desarrollador-jr','Mobile Engineer (Innovative Tech Explorer)','Tech Ambition',NULL,'etorres@bit.lat',1),
 ('econtreras','Emilio Contreras Vilchis','Emilio','desarrollador-sr','Desarrollador . net SR (Innovative Tech Explorer Sr)','Tech Ambition',NULL,'econtreras@bit.lat',1),
 ('gmartinez','Graciela Martínez Mejía','Grace','desarrollador-mid','Data Empowerment Explorer','Analytics Solutions',NULL,'gmartinez@bit.lat',1),
 ('gguadarrama','Gregorio Guadarrama Ayala','Gregorio','desarrollador-sr','Desarrollador . net SR (Innovative Tech Explorer Sr)','Tech Ambition',NULL,'gguadarrama@bit.lat',1),
 ('henriquez','Guillermo Hugo Enríquez Venegas','Hugo','desarrollador-sr','Desarrollador . net SR (Innovative Tech Explorer Sr)','Tech Ambition',NULL,'henriquez@bit.lat',1),
 ('jlopez','Jasiel López Arellano','Jasiel','desarrollador-jr','Full-Stack Developer (Innovative Tech Explorer)','Tech Ambition',NULL,'jlopez@bit.lat',1),
 ('asierra','Jonathan Alexis Sierra Pacheco','Alexis','desarrollador-mid','Frontend Developer Mid Sr (Innovative Tech Explorer)','Tech Ambition',NULL,'asierra@bit.lat',1),
 ('ameza','Jose Armando Meza Vigueras','Arman','desarrollador-jr','Mobile Engineer (Innovative Tech Explorer)','Tech Ambition',NULL,'ameza@bit.lat',1),
 ('jpatino','Josue Salvador Patiño Degollado','Josue','arquitecto-tecnico','Software Architect (Tech Ambition Explorer)','Tech Ambition',NULL,'jpatino@bit.lat',1),
 ('jrojas','Julia Rojas Ampudia','July','desarrollador-jr','Full-Stack Developer (Innovative Tech Explorer)','Tech Ambition',NULL,'jrojas@bit.lat',1),
 ('lbernal','Luis Bernal Velázquez','Luis','arquitecto-tecnico','Tech Lead (Successful Innovation Explorer)','Tech Ambition',NULL,'lbernal@bit.lat',1),
 ('mramirez','Mario Ramírez Pérez','Mario','desarrollador-mid','Product Support Engineer (Innovative Tech Explorer)','Tech Ambition',NULL,'mramirez@bit.lat',1),
 ('rbernal','Raúl Bernal Velázquez','Raúl','arquitecto-tecnico','Tech Lead (Successful Innovation Explorer)','Tech Ambition',NULL,'rbernal@bit.lat',1),
 ('avazquez','Alejandro Vázquez Carbajal','Alejandro','desarrollador-mid','Full-Stack Developer (Innovative Tech Explorer)','Tech Ambition',NULL,'avazquez@bit.lat',1),
 ('amorales','Angel Morales','Angel','desarrollador-jr','Full-Stack Developer (Innovative Tech Explorer)','Tech Ambition',NULL,'amorales@bit.lat',1),
 ('czamudio','Carlos Zamudio','Carlos','project-manager','Project Manager (Successful Project Explorer)','Growth Experiences',NULL,'czamudio@bit.lat',1),
 ('dgonzalez','David Alejandro González Velázquez','Dave','project-manager','Project Manager (Successful Project Explorer)','Growth Experiences',NULL,'dgonzalez@bit.lat',1),
 ('hloredo','David Haylton Loredo Ruiz','Haylton','product-manager','Product Manager (Successful Product Explorer)','Growth Experiences',NULL,'hloredo@bit.lat',1),
 ('eramirez','Edin Ramirez','Edin','ux-ui','Ux / Ui','Growth Experiences',NULL,'eramirez@bit.lat',1),
 ('emontano','Eduardo Montaño Gómez','Montaño','arquitecto-tecnico','Software Architect (Tech Ambition Explorer)','Tech Ambition',NULL,'emontano@bit.lat',1),
 ('egonzalez','Erithan Eduardo Gonzalez Ruiz','Erithan','qa','QA Analyst (Tech Excellence Explorer)','Tech Ambition',NULL,'egonzalez@bit.lat',1),
 ('lolvera','Lorena Raquel Olvera Rodriguez','Lore','desarrollador-jr','Backend Developer (Innovative Tech Explorer)','Tech Ambition',NULL,'lolvera@bit.lat',1),
 ('nmejia','Nallely Mejia Torres','Nalle','project-manager','Project Manager (Successful Project Explorer)','Growth Experiences',NULL,'nmejia@bit.lat',1),
 ('rescobar','Rafael Escobar','Rafa','desarrollador-trainee','Mobile Engineer (Innovative Tech Explorer)','Tech Ambition',NULL,'rescobar@bit.lat',1),
 ('rcuevas','Rodolfo Alejandro Cuevas Infante','Fito','arquitecto-tecnico','Software Architect (Tech Ambition Explorer)','Tech Ambition',NULL,'rcuevas@bit.lat',1),
 ('jenriquez','Jorge Alberto Enríquez Salazar','George','arquitecto-tecnico','Software Architect (Tech Ambition Explorer)','Tech Ambition',NULL,'jenriquez@bit.lat',1),
 ('fgonzalez','Favio Antonio González Vaca','Favio','service-manager','Service Manager (Allies Networking)','Growth Experiences',NULL,'fgonzalez@bit.lat',1),
 ('fgonzalezr','Fabian Gonzalez Ruiz','Fabian','cio','Chief Information Officer','Growth Experiences',NULL,'fgonzalezr@bit.lat',1),
 ('mhernandez','Maricruz Hernández','Maricruz',NULL,NULL,NULL,NULL,'mhernandez@bit.lat',0),
 ('earzate','Edgar Alfonso Arzate','Arzate','ceo',NULL,NULL,NULL,'earzate@bit.lat',1);

-- (5) Resuelve manager_id desde jefe_id (local-part) de la hoja.
--     earzate y mhernandez quedan con manager_id NULL (sin jefe en la hoja).
update "equipo" set "manager_id"='earzate' where "id" in ('fgonzalez','fgonzalezr');
update "equipo" set "manager_id"='fgonzalez' where "id" in ('aaguilar','dperez','egonzalez','gmartinez');
update "equipo" set "manager_id"='fgonzalezr' where "id" in ('amorales','emontano','eramirez','hloredo','jenriquez','rcuevas');
update "equipo" set "manager_id"='hloredo' where "id" in ('czamudio');
update "equipo" set "manager_id"='jenriquez' where "id" in ('alara','ameza','aserrano','asierra','avazquez','econtreras','etorres','gguadarrama','henriquez','jlopez','jpatino','jrojas','lbernal','lolvera','mramirez','rbernal','rescobar');
update "equipo" set "manager_id"='rcuevas' where "id" in ('dgonzalez','nmejia');

-- (6) Re-vincula los logins existentes por email (idempotente).
update "user" set "equipoId" = (
  select e."id" from "equipo" e where lower(e."email") = lower("user"."email")
) where exists (
  select 1 from "equipo" e where lower(e."email") = lower("user"."email")
);
