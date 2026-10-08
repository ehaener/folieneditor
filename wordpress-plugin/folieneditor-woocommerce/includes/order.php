<?php
// Bestellung: Gestaltung und Druckdateien an die Bestellposition hängen,
// im Backend Vorschau und Download des Druck-PDFs anzeigen.

defined( 'ABSPATH' ) || exit;

add_action( 'woocommerce_checkout_create_order_line_item', function ( $item, $cart_key, $values ) {
	if ( empty( $values['folieneditor']['design'] ) ) {
		return;
	}
	$fe = $values['folieneditor'];
	foreach ( folieneditor_rows( $fe['design'] ) as $key => $value ) {
		$item->add_meta_data( $key, $value, true );
	}
	$item->add_meta_data( '_folieneditor_design', wp_json_encode( $fe['design'] ), true );
	$item->add_meta_data( '_folieneditor_pdf', $fe['pdf'], true );
	$item->add_meta_data( '_folieneditor_preview', $fe['preview'], true );
}, 10, 3 );

// Interne Felder in der Bestellansicht nicht als Text anzeigen
add_filter( 'woocommerce_hidden_order_itemmeta', function ( $keys ) {
	return array_merge( $keys, [ '_folieneditor_design', '_folieneditor_pdf', '_folieneditor_preview' ] );
} );

function folieneditor_pdf_download_url( int $item_id ): string {
	return wp_nonce_url( admin_url( 'admin-post.php?action=folieneditor_pdf&item=' . $item_id ), 'folieneditor_pdf_' . $item_id );
}

// Vorschau und Download unter der Position in der Bestellansicht (Backend)
add_action( 'woocommerce_after_order_itemmeta', function ( $item_id, $item ) {
	if ( ! is_admin() || ! $item instanceof WC_Order_Item_Product || ! $item->get_meta( '_folieneditor_pdf' ) ) {
		return;
	}
	$preview = (string) $item->get_meta( '_folieneditor_preview' );
	echo '<div class="folieneditor-admin" style="margin-top:8px">';
	if ( $preview && folieneditor_file_path( $preview ) ) {
		echo '<img src="' . esc_url( folieneditor_file_url( $preview ) ) . '" alt="Vorschau" style="display:block;max-width:420px;width:100%;height:auto;border:1px solid #ddd;margin-bottom:6px" />';
	}
	echo '<a class="button" href="' . esc_url( folieneditor_pdf_download_url( (int) $item_id ) ) . '">Druck-PDF herunterladen</a>';
	echo '</div>';
}, 10, 2 );

// Geschützter Download des Druck-PDFs
add_action( 'admin_post_folieneditor_pdf', function () {
	$item_id = absint( $_GET['item'] ?? 0 ); // phpcs:ignore WordPress.Security.NonceVerification
	check_admin_referer( 'folieneditor_pdf_' . $item_id );
	if ( ! current_user_can( 'edit_shop_orders' ) ) {
		wp_die( 'Keine Berechtigung.', 403 );
	}
	$item = WC_Order_Factory::get_order_item( $item_id );
	$path = $item ? folieneditor_file_path( (string) $item->get_meta( '_folieneditor_pdf' ) ) : '';
	if ( ! $path || ! is_readable( $path ) ) {
		wp_die( 'Die Druckdatei wurde nicht gefunden.', 404 );
	}
	$d    = json_decode( (string) $item->get_meta( '_folieneditor_design' ), true ) ?: [];
	$size = isset( $d['wcm'], $d['hcm'] ) ? '_' . str_replace( '.', ',', $d['wcm'] . 'x' . $d['hcm'] ) . 'cm' : '';
	$name = sprintf( 'bestellung-%d_pos-%d%s.pdf', $item->get_order_id(), $item_id, $size );
	nocache_headers();
	header( 'Content-Type: application/pdf' );
	header( 'Content-Disposition: attachment; filename="' . $name . '"' );
	header( 'Content-Length: ' . filesize( $path ) );
	readfile( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	exit;
} );
