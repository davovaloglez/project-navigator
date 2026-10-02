-- Seed: pueblo `equipo.tag` con los nombres display "First Last" reales.
-- Fuente: hoja `equipo`, columna `tag` (mocks/p-Nav_Data_29-05.xlsx).
-- Aplicar UNA vez DESPUÉS de migrations/2026-equipo-tag.sql:
--   turso db shell <db> < src/db/seeds/equipo-tag-2026-05-29.sql
--
-- Idempotente: solo actualiza si la persona existe (sin INSERT). Re-correr es seguro.

update "equipo" set "tag" = 'Alejandra Serrano'    where "id" = 'aserrano';
update "equipo" set "tag" = 'Alfredo Lara'         where "id" = 'alara';
update "equipo" set "tag" = 'Ana Luz Aguilar'      where "id" = 'aaguilar';
update "equipo" set "tag" = 'Dulce Perez'          where "id" = 'dperez';
update "equipo" set "tag" = 'Edgar Torres'         where "id" = 'etorres';
update "equipo" set "tag" = 'Emilio Contreras'     where "id" = 'econtreras';
update "equipo" set "tag" = 'Graciela Martinez'    where "id" = 'gmartinez';
update "equipo" set "tag" = 'Gregorio Guadarrama'  where "id" = 'gguadarrama';
update "equipo" set "tag" = 'Hugo Enríquez'        where "id" = 'henriquez';
update "equipo" set "tag" = 'Jasiel López'         where "id" = 'jlopez';
update "equipo" set "tag" = 'Alexis Sierra'        where "id" = 'asierra';
update "equipo" set "tag" = 'Armando Meza'         where "id" = 'ameza';
update "equipo" set "tag" = 'Josue Patiño'         where "id" = 'jpatino';
update "equipo" set "tag" = 'Julia Rojas'          where "id" = 'jrojas';
update "equipo" set "tag" = 'Luis Bernal'          where "id" = 'lbernal';
update "equipo" set "tag" = 'Mario Ramírez'        where "id" = 'mramirez';
update "equipo" set "tag" = 'Raúl Bernal'          where "id" = 'rbernal';
update "equipo" set "tag" = 'Alejandro Vázquez'    where "id" = 'avazquez';
update "equipo" set "tag" = 'Angel Morales'        where "id" = 'amorales';
update "equipo" set "tag" = 'Carlos Zamudio'       where "id" = 'czamudio';
update "equipo" set "tag" = 'David González'       where "id" = 'dgonzalez';
update "equipo" set "tag" = 'Haylton Loredo'       where "id" = 'hloredo';
update "equipo" set "tag" = 'Edin Ramirez'         where "id" = 'eramirez';
update "equipo" set "tag" = 'Eduardo Montaño'      where "id" = 'emontano';
update "equipo" set "tag" = 'Erithan González'     where "id" = 'egonzalez';
update "equipo" set "tag" = 'Lorena Olvera'        where "id" = 'lolvera';
update "equipo" set "tag" = 'Nallely Mejía'        where "id" = 'nmejia';
update "equipo" set "tag" = 'Rafael Escobar'       where "id" = 'rescobar';
update "equipo" set "tag" = 'Rodolfo Cuevas'       where "id" = 'rcuevas';
update "equipo" set "tag" = 'Jorge Enríquez'       where "id" = 'jenriquez';
update "equipo" set "tag" = 'Favio Gonzalez'       where "id" = 'fgonzalez';
update "equipo" set "tag" = 'Fabián González'      where "id" = 'fgonzalezr';
update "equipo" set "tag" = 'Maricruz Hernández'   where "id" = 'mhernandez';
update "equipo" set "tag" = 'Edgar Arzate'         where "id" = 'earzate';
