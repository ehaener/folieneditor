<?php
// Druckdateien für die Produktion: alle Folien einer Bestellung (oder mehrerer
// Bestellungen) als ZIP mit Auftragsliste, Übersicht in der Bestellung und
// automatischer Versand per E-Mail, sobald die Bestellung bezahlt ist.

defined( 'ABSPATH' ) || exit;

const FOLIENEDITOR_MAIL_MAX = 15 * MB_IN_BYTES;   // größere ZIPs nicht anhängen, nur verlinken

function folieneditor_cm( $v ): string {
	return str_replace( '.', ',', (string) ( floor( $v ) == $v ? (int) $v : round( $v, 1 ) ) );
}

// Alle gestalteten Folien einer Bestellung, durchnummeriert ab 1.
function folieneditor_order_files( WC_Order $order ): array {
	$out = [];
	$pos = 0;
	foreach ( $order->get_items() as $item_id => $item ) {
		$pdf = (string) $item->get_meta( '_folieneditor_pdf' );
		if ( ! $pdf ) {
			continue;
		}
		$pos++;
		$d     = json_decode( (string) $item->get_meta( '_folieneditor_design' ), true ) ?: [];
		$qty   = (int) $item->get_quantity();
		$size  = isset( $d['wcm'], $d['hcm'] ) ? folieneditor_cm( $d['wcm'] ) . 'x' . folieneditor_cm( $d['hcm'] ) . 'cm' : '';
		$out[] = [
			'item_id' => (int) $item_id,
			'pos'     => $pos,
			'qty'     => $qty,
			'design'  => $d,
			'path'    => folieneditor_file_path( $pdf ),
			// z. B. 1234-01_2x_120x12cm.pdf: Bestellung, Position, Stückzahl, Endformat
			'name'    => sanitize_file_name( sprintf( '%s-%02d_%dx_%s.pdf', $order->get_order_number(), $pos, $qty, $size ) ),
		];
	}
	return $out;
}

// Auftragsliste als CSV (Semikolon, UTF-8 mit BOM, öffnet direkt in Excel).
function folieneditor_csv( array $orders ): string {
	$rows = [ [ 'Bestellung', 'Position', 'Menge', 'Breite (cm)', 'Höhe (cm)', 'Text', 'Schrift', 'Hintergrund (CMYK)', 'Textfarbe (CMYK)', 'Bild/Logo', 'Datei' ] ];
	foreach ( $orders as $order ) {
		foreach ( folieneditor_order_files( $order ) as $f ) {
			$d      = $f['design'];
			$r      = folieneditor_rows( $d + [ 'wcm' => 0, 'hcm' => 0, 'text' => '', 'font' => 'andika', 'bg' => [ 0, 0, 0, 0 ], 'fg' => [ 0, 0, 0, 100 ], 'imgPos' => '', 'imgScale' => 100 ] );
			$rows[] = [
				$order->get_order_number(), $f['pos'], $f['qty'],
				folieneditor_cm( $d['wcm'] ?? 0 ), folieneditor_cm( $d['hcm'] ?? 0 ),
				str_replace( [ "\r\n", "\n" ], ' / ', $d['text'] ?? '' ),
				$r['Schrift'], $r['Hintergrund'], $r['Textfarbe'], $r['Bild/Logo'] ?? '', $f['name'],
			];
		}
	}
	$fh = fopen( 'php://temp', 'r+' );
	fwrite( $fh, "\xEF\xBB\xBF" );
	foreach ( $rows as $row ) {
		fputcsv( $fh, $row, ';', '"', '' );
	}
	rewind( $fh );
	return (string) stream_get_contents( $fh );
}

// Baut ein ZIP mit allen Druckdateien und auftrag.csv. Gibt den Pfad einer
// temporären Datei zurück (danach löschen) oder WP_Error.
function folieneditor_build_zip( array $orders ) {
	if ( ! class_exists( 'ZipArchive' ) ) {
		return new WP_Error( 'folieneditor', 'Auf dem Server fehlt die PHP-Erweiterung „zip“. Bitte die Druckdateien einzeln herunterladen.' );
	}
	$tmp = wp_tempnam( 'druckdateien.zip' );
	$zip = new ZipArchive();
	if ( true !== $zip->open( $tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE ) ) {
		return new WP_Error( 'folieneditor', 'Das ZIP konnte nicht erstellt werden.' );
	}
	$count   = 0;
	$missing = [];
	foreach ( $orders as $order ) {
		foreach ( folieneditor_order_files( $order ) as $f ) {
			if ( $f['path'] && is_readable( $f['path'] ) ) {
				$zip->addFile( $f['path'], $f['name'] );
				$count++;
			} else {
				$missing[] = $f['name'];
			}
		}
	}
	if ( ! $count ) {
		$zip->close();
		wp_delete_file( $tmp );
		return new WP_Error( 'folieneditor', 'In der Auswahl sind keine gestalteten Folien.' );
	}
	$zip->addFromString( 'auftrag.csv', folieneditor_csv( $orders ) );
	if ( $missing ) {
		$zip->addFromString( 'FEHLENDE-DATEIEN.txt', "Diese Druckdateien wurden nicht gefunden:\n" . implode( "\n", $missing ) . "\n" );
	}
	$zip->close();
	return $tmp;
}

function folieneditor_send_file( string $path, string $name, string $type ): void {
	nocache_headers();
	header( 'Content-Type: ' . $type );
	header( 'Content-Disposition: attachment; filename="' . $name . '"' );
	header( 'Content-Length: ' . filesize( $path ) );
	readfile( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions
}

// ---- Downloads im Backend ----
function folieneditor_zip_url( int $order_id ): string {
	return wp_nonce_url( admin_url( 'admin-post.php?action=folieneditor_zip&order=' . $order_id ), 'folieneditor_zip_' . $order_id );
}

add_action( 'admin_post_folieneditor_zip', function () {
	$order_id = absint( $_GET['order'] ?? 0 ); // phpcs:ignore WordPress.Security.NonceVerification
	check_admin_referer( 'folieneditor_zip_' . $order_id );
	$order = wc_get_order( $order_id );
	if ( ! current_user_can( 'edit_shop_orders' ) || ! $order ) {
		wp_die( 'Keine Berechtigung.', 403 );
	}
	$zip = folieneditor_build_zip( [ $order ] );
	if ( is_wp_error( $zip ) ) {
		wp_die( esc_html( $zip->get_error_message() ) );
	}
	folieneditor_send_file( $zip, 'druckdateien_bestellung-' . $order->get_order_number() . '.zip', 'application/zip' );
	wp_delete_file( $zip );
	exit;
} );

// Sammel-Download für mehrere Bestellungen aus der Bestellliste (HPOS und klassisch)
foreach ( [ 'woocommerce_page_wc-orders', 'edit-shop_order' ] as $screen ) {
	add_filter( "bulk_actions-$screen", function ( $actions ) {
		$actions['folieneditor_zip'] = 'Druckdateien herunterladen (ZIP)';
		return $actions;
	} );
	add_filter( "handle_bulk_actions-$screen", function ( $redirect, $action, $ids ) {
		if ( 'folieneditor_zip' !== $action ) {
			return $redirect;
		}
		if ( ! current_user_can( 'edit_shop_orders' ) ) {
			wp_die( 'Keine Berechtigung.', 403 );
		}
		$orders = array_filter( array_map( 'wc_get_order', array_map( 'absint', (array) $ids ) ) );
		$zip    = folieneditor_build_zip( $orders );
		if ( is_wp_error( $zip ) ) {
			wp_die( esc_html( $zip->get_error_message() ), '', [ 'back_link' => true ] );
		}
		folieneditor_send_file( $zip, 'druckdateien_' . wp_date( 'Y-m-d_H-i' ) . '.zip', 'application/zip' );
		wp_delete_file( $zip );
		exit;
	}, 10, 3 );
}

// ---- Übersicht in der Bestellung (Box in der Seitenleiste) ----
add_action( 'add_meta_boxes', function () {
	$screen = function_exists( 'wc_get_page_screen_id' ) ? wc_get_page_screen_id( 'shop-order' ) : 'shop_order';
	add_meta_box( 'folieneditor-files', 'Druckdateien', 'folieneditor_meta_box', $screen, 'side', 'high' );
} );

function folieneditor_meta_box( $post_or_order ): void {
	$order = $post_or_order instanceof WC_Order ? $post_or_order : wc_get_order( $post_or_order->ID );
	$files = $order ? folieneditor_order_files( $order ) : [];
	if ( ! $files ) {
		echo '<p>Keine gestalteten Folien in dieser Bestellung.</p>';
		return;
	}
	$pieces = array_sum( array_column( $files, 'qty' ) );
	printf( '<p><strong>%d %s, %d Stück</strong></p><ul style="margin:0 0 12px">', count( $files ), 1 === count( $files ) ? 'Folie' : 'Folien', (int) $pieces );
	foreach ( $files as $f ) {
		$ok = $f['path'] && is_readable( $f['path'] );
		printf(
			'<li>%s <a href="%s">%s</a>%s</li>',
			esc_html( sprintf( 'Pos. %d:', $f['pos'] ) ),
			esc_url( folieneditor_pdf_download_url( $f['item_id'] ) ),
			esc_html( $f['name'] ),
			$ok ? '' : ' <span style="color:#b32d2e">(Datei fehlt)</span>'
		);
	}
	echo '</ul>';
	echo '<p><a class="button button-primary" href="' . esc_url( folieneditor_zip_url( $order->get_id() ) ) . '">Alle als ZIP herunterladen</a></p>';
	$mailed = $order->get_meta( '_folieneditor_mailed' );
	if ( $mailed ) {
		echo '<p class="description">' . esc_html( $mailed ) . '</p>';
	}
	if ( is_email( get_option( 'folieneditor_mail_to' ) ) ) {
		$url = wp_nonce_url( admin_url( 'admin-post.php?action=folieneditor_resend&order=' . $order->get_id() ), 'folieneditor_resend_' . $order->get_id() );
		printf( '<p><a href="%s">%s</a></p>', esc_url( $url ), $mailed ? 'Erneut an Druckerei senden' : 'Jetzt an Druckerei senden' );
	}
}

// ---- Versand per E-Mail nach Bezahlung ----
function folieneditor_mail_statuses(): array {
	return 'on-hold' === get_option( 'folieneditor_mail_trigger', 'processing' )
		? [ 'on-hold', 'processing', 'completed' ]
		: [ 'processing', 'completed' ];
}

// Schickt die Druckdateien an die eingestellte Adresse. Gibt true oder WP_Error zurück.
function folieneditor_mail_files( WC_Order $order ) {
	$to    = get_option( 'folieneditor_mail_to' );
	$files = folieneditor_order_files( $order );
	if ( ! is_email( $to ) || ! $files ) {
		return new WP_Error( 'folieneditor', 'Keine Empfängeradresse eingestellt oder keine Folien in der Bestellung.' );
	}
	$zip = folieneditor_build_zip( [ $order ] );
	if ( is_wp_error( $zip ) ) {
		return $zip;
	}
	$nr     = $order->get_order_number();
	$pieces = array_sum( array_column( $files, 'qty' ) );
	$count  = count( $files ) . ( 1 === count( $files ) ? ' Folie' : ' Folien' ) . ", $pieces Stück";
	$lines  = [ "Druckdateien zu Bestellung $nr ($count):", '' ];
	foreach ( $files as $f ) {
		$d       = $f['design'];
		$lines[] = sprintf( 'Pos. %d: %d × %s × %s cm – %s', $f['pos'], $f['qty'], folieneditor_cm( $d['wcm'] ?? 0 ), folieneditor_cm( $d['hcm'] ?? 0 ), $f['name'] );
	}
	$lines[] = '';
	$lines[] = 'Alle PDFs mit 2 mm Beschnitt, Farben in CMYK. Details in auftrag.csv.';

	// ZIP mit sprechendem Namen anhängen; zu große ZIPs nur im Backend
	$attach = [];
	$named  = '';
	if ( filesize( $zip ) <= FOLIENEDITOR_MAIL_MAX ) {
		$named = trailingslashit( dirname( $zip ) ) . 'druckdateien_bestellung-' . sanitize_file_name( $nr ) . '.zip';
		rename( $zip, $named );
		$attach = [ $named ];
	} else {
		$lines[] = '';
		$lines[] = 'Die Dateien sind zu groß für den Anhang. Download im Shop-Backend: ' . $order->get_edit_order_url();
	}
	$sent = wp_mail( $to, "Druckdateien Bestellung $nr ($count)", implode( "\n", $lines ), [], $attach );
	wp_delete_file( $named ?: $zip );
	if ( ! $sent ) {
		return new WP_Error( 'folieneditor', 'Die E-Mail konnte nicht gesendet werden.' );
	}
	return true;
}

function folieneditor_mail_and_note( WC_Order $order ): void {
	$result = folieneditor_mail_files( $order );
	$to     = get_option( 'folieneditor_mail_to' );
	if ( is_wp_error( $result ) ) {
		$order->add_order_note( 'Folieneditor: Druckdateien nicht gesendet. ' . $result->get_error_message() );
		return;
	}
	$text = sprintf( 'Druckdateien am %s an %s gesendet.', wp_date( 'd.m.Y, H:i' ), $to );
	$order->update_meta_data( '_folieneditor_mailed', $text );
	$order->save();
	$order->add_order_note( 'Folieneditor: ' . $text );
}

add_action( 'woocommerce_order_status_changed', function ( $order_id, $from, $to, $order ) {
	if ( ! in_array( $to, folieneditor_mail_statuses(), true ) || ! is_email( get_option( 'folieneditor_mail_to' ) ) ) {
		return;
	}
	$order = $order instanceof WC_Order ? $order : wc_get_order( $order_id );
	if ( ! $order || $order->get_meta( '_folieneditor_mailed' ) || ! folieneditor_order_files( $order ) ) {
		return;   // nur einmal automatisch senden
	}
	folieneditor_mail_and_note( $order );
}, 20, 4 );

add_action( 'admin_post_folieneditor_resend', function () {
	$order_id = absint( $_GET['order'] ?? 0 ); // phpcs:ignore WordPress.Security.NonceVerification
	check_admin_referer( 'folieneditor_resend_' . $order_id );
	$order = wc_get_order( $order_id );
	if ( ! current_user_can( 'edit_shop_orders' ) || ! $order ) {
		wp_die( 'Keine Berechtigung.', 403 );
	}
	folieneditor_mail_and_note( $order );
	wp_safe_redirect( $order->get_edit_order_url() );
	exit;
} );
