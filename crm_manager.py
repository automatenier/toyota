#!/usr/bin/env python3
"""
Toyota CRM Sheet Manager
Interacts directly with Google Sheets API using Service Account credentials.
Spreadsheet: https://docs.google.com/spreadsheets/d/10bdJgupeYWTA_pHQ-qGjIlANb-dmR8yHyOisdbQc1e0/edit
"""

import sys
import json
import argparse
from datetime import datetime
import urllib.request
import google.oauth2.service_account
import google.auth.transport.requests

SPREADSHEET_ID = "10bdJgupeYWTA_pHQ-qGjIlANb-dmR8yHyOisdbQc1e0"
SA_KEY_PATH = "/home/jordan/.config/agent-secrets/google/service-accounts/festive-kayak-459112-e0-652c6280d2b4.json"

def get_authorized_token():
    with open(SA_KEY_PATH, "r") as f:
        key_info = json.load(f)
    creds = google.oauth2.service_account.Credentials.from_service_account_info(
        key_info,
        scopes=["https://www.googleapis.com/auth/spreadsheets"]
    )
    req = google.auth.transport.requests.Request()
    creds.refresh(req)
    return creds.token

def list_leads():
    token = get_authorized_token()
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/Sheet1!A1:J100"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    
    rows = data.get("values", [])
    if not rows:
        print("Tidak ada data ditemukan di sheet.")
        return

    print("\n" + "=" * 90)
    print(" TOYOTA CRM LEADS - MAS JORDAN (TUNAS TOYOTA)")
    print(f" Spreadsheet: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit")
    print("=" * 90)
    
    headers = rows[0]
    col_widths = [19, 22, 14, 22, 20, 18]
    
    print(f"{headers[0]:<19} | {headers[1]:<22} | {headers[2]:<14} | {headers[3]:<22} | {headers[4]:<20}")
    print("-" * 105)
    for row in rows[1:]:
        ts = (row[0] if len(row) > 0 else "-")[:19]
        name = (row[1] if len(row) > 1 else "-")[:22]
        phone = (row[2] if len(row) > 2 else "-")[:14]
        model = (row[3] if len(row) > 3 else "-")[:22]
        plan = (row[4] if len(row) > 4 else "-")[:20]
        print(f"{ts:<19} | {name:<22} | {phone:<14} | {model:<22} | {plan:<20}")
    print("=" * 105)
    print(f"Total leads terdaftar: {len(rows) - 1}\n")

def add_lead(name, phone, model, scheme, domicile, budget="-", status="🔥 New Lead", source="Manual CLI / API", notes=""):
    token = get_authorized_token()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    row_data = [
        now_str,
        name,
        phone,
        model,
        scheme,
        domicile,
        budget,
        status,
        source,
        notes
    ]
    
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/Sheet1!A:J:append?valueInputOption=USER_ENTERED"
    body = json.dumps({"values": [row_data]}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    
    print(f"[OK] Lead berhasil ditambahkan ke Google Sheet!")
    print(f"  Nama   : {name}")
    print(f"  WA     : {phone}")
    print(f"  Model  : {model}")
    print(f"  Skema  : {scheme}")
    print(f"  Wilayah: {domicile}")
    print(f"  Updated Range: {result.get('updates', {}).get('updatedRange')}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Toyota CRM Lead Manager")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("list", help="Tampilkan daftar lead di CRM")
    
    add_p = subparsers.add_parser("add", help="Tambah lead baru")
    add_p.add_argument("--name", required=True, help="Nama konsumen")
    add_p.add_argument("--phone", required=True, help="Nomor WhatsApp")
    add_p.add_argument("--model", default="Avanza 1.5 G CVT", help="Model Toyota")
    add_p.add_argument("--scheme", default="Paket Low DP (DP 18 JT)", help="Skema pembelian")
    add_p.add_argument("--domicile", default="Jakarta Selatan", help="Domisili")
    add_p.add_argument("--notes", default="", help="Catatan tambahan")

    args = parser.parse_args()

    if args.command == "add":
        add_lead(args.name, args.phone, args.model, args.scheme, args.domicile, notes=args.notes)
    else:
        list_leads()
