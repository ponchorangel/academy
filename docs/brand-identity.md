# Identidad base de Academy by Scalaria

## Decisión

Academy usa la identidad de producto de Scalaria como marca base. La identidad de cada organización cliente será una capa configurable posterior; no debe mezclarse con los estilos base ni con datos de demostración.

## Referencia revisada

La referencia local disponible es la aplicación principal de Scalaria, especialmente `apps/base44/scalaria/src/components/Logo.jsx` y `src/index.css`.

## Sistema base aplicado

- Azul Scalaria: `#0091D1`.
- Naranja de acento: `#D48C3C`.
- Texto principal: azul pizarra oscuro.
- Tipografía: Inter.
- Logotipo: círculo con barras ascendentes y barra central naranja.
- Superficies: blanco y fondos azul muy claro.

La paleta verde anterior se retiró de la interfaz base porque acercaba visualmente Academy a una marca cliente específica.

## Personalización futura por organización

La entidad `AcademyOrganization` ya contempla nombre, logo, color principal, dominio, mensaje de bienvenida y módulos habilitados. Esa configuración se aplicará en una capa de tema por tenant cuando construyamos el panel de personalización; no se incorporan valores de ningún cliente en la identidad base.
